const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

const CONTAINERS_FILE = path.join(__dirname, 'containers.json');
const GLUETUN_IMAGE = 'qmcgaw/gluetun';

// Load container configs from JSON
async function loadContainers() {
  try {
    const data = await fs.readFile(CONTAINERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

// Save container configs to JSON
async function saveContainers(containers) {
  await fs.writeFile(CONTAINERS_FILE, JSON.stringify(containers, null, 2));
}

// Get all Gluetun containers
async function listContainers() {
  const configs = await loadContainers();
  const dockerContainers = await docker.listContainers({ all: true });
  
  const gluetunContainers = dockerContainers.filter(c => 
    c.Names.some(name => name.includes('gluetun'))
  );

  const result = [];
  
  for (const dc of gluetunContainers) {
    const name = dc.Names[0].replace('/', '');
    const config = configs[name] || {};
    
    result.push({
      name,
      id: dc.Id,
      state: dc.State,
      status: dc.Status,
      controlPort: config.controlPort,
      proxyPort: config.proxyPort,
      country: config.country,
      created: dc.Created
    });
  }
  
  return result;
}

// Get next available container name
async function getNextContainerName() {
  const containers = await listContainers();
  const numbers = containers
    .map(c => c.name.match(/^gluetun-(\d+)$/))
    .filter(m => m)
    .map(m => parseInt(m[1]));
  
  if (numbers.length === 0) return 'gluetun-1';
  
  const maxNum = Math.max(...numbers);
  return `gluetun-${maxNum + 1}`;
}

// Create new Gluetun container
async function createContainer(config) {
  const {
    name,
    privateKey,
    address,
    country,
    controlPort,
    proxyPort
  } = config;

  // Use generated auth file
  const authPath = await require('./config').generateAuthFile();

  // Validate ports are not in use
  const usedPorts = await getUsedPorts();
  if (usedPorts.includes(controlPort)) {
    throw new Error(`Control port ${controlPort} is already in use`);
  }
  if (usedPorts.includes(proxyPort)) {
    throw new Error(`Proxy port ${proxyPort} is already in use`);
  }

  const containerConfig = {
    Image: GLUETUN_IMAGE,
    name: name,
    Hostname: name,
    HostConfig: {
      CapAdd: ['NET_ADMIN'],
      Devices: [
        {
          PathOnHost: '/dev/net/tun',
          PathInContainer: '/dev/net/tun',
          CgroupPermissions: 'rwm'
        }
      ],
      PortBindings: {
        '8000/tcp': [{ HostIp: '127.0.0.1', HostPort: controlPort.toString() }],
        '8888/tcp': [{ HostIp: '127.0.0.1', HostPort: proxyPort.toString() }]
      },
      Binds: [
        `${authPath}:/gluetun/auth/config.toml:ro`
      ],
      Mounts: [
        {
          Type: 'volume',
          Source: `gluetun-data-${name}`,
          Target: '/gluetun'
        }
      ],
      RestartPolicy: {
        Name: 'unless-stopped'
      }
    },
    Env: [
      'HTTPPROXY=on',
      'HTTP_CONTROL_SERVER_ADDRESS=:8000',
      'HTTP_CONTROL_SERVER_AUTH_CONFIG_FILEPATH=/gluetun/auth/config.toml',
      'VPN_SERVICE_PROVIDER=surfshark',
      'VPN_TYPE=wireguard',
      `WIREGUARD_PRIVATE_KEY=${privateKey}`,
      `WIREGUARD_ADDRESSES=${address}`,
      `SERVER_COUNTRIES=${country}`,
      'UPDATER_PERIOD=24h',
      'DOT=off',
      'HEALTH_VPN_DURATION_INITIAL=30s'
    ],
    ExposedPorts: {
      '8000/tcp': {},
      '8888/tcp': {},
      '8388/tcp': {},
      '8388/udp': {}
    }
  };

  // Create container
  const container = await docker.createContainer(containerConfig);
  
  try {
    // Start container first
    await container.start();
    
    // Only save config if start succeeded
    const containers = await loadContainers();
    containers[name] = {
      controlPort,
      proxyPort,
      country,
      privateKey,
      address,
      createdAt: new Date().toISOString()
    };
    await saveContainers(containers);

    return {
      id: container.id,
      name,
      controlPort,
      proxyPort
    };
  } catch (error) {
    // If start fails, clean up the container
    try {
      await container.remove();
    } catch (cleanupError) {
      console.error(`Failed to cleanup container after start failure: ${cleanupError.message}`);
    }
    throw error;
  }
}

// Delete container
async function deleteContainer(name) {
  const dockerContainers = await docker.listContainers({ all: true });
  const containerInfo = dockerContainers.find(c => 
    c.Names.some(n => n === `/${name}`)
  );

  if (!containerInfo) {
    throw new Error(`Container ${name} not found`);
  }

  const container = docker.getContainer(containerInfo.Id);
  
  // Stop if running
  if (containerInfo.State === 'running') {
    await container.stop();
  }

  // Remove container
  await container.remove();

  // Remove associated volume
  const volumeName = `gluetun-data-${name}`;
  try {
    const volume = docker.getVolume(volumeName);
    await volume.remove();
    console.log(`Removed volume: ${volumeName}`);
  } catch (volumeError) {
    console.error(`Failed to remove volume ${volumeName}: ${volumeError.message}`);
  }

  // Remove from config
  const containers = await loadContainers();
  delete containers[name];
  await saveContainers(containers);
}

// Start container
async function startContainer(name) {
  const container = docker.getContainer(name);
  await container.start();
}

// Stop container
async function stopContainer(name) {
  const container = docker.getContainer(name);
  await container.stop();
}

// Get container status and IP info
async function getContainerStatus(name) {
  const containers = await loadContainers();
  const config = containers[name];
  
  if (!config) {
    throw new Error(`Container ${name} not found in config`);
  }

  try {
    const axios = require('axios');
    const auth = await require('./config').getAuthConfig();
    const response = await axios.get(`http://localhost:${config.controlPort}/v1/publicip/ip`, {
      auth: auth,
      timeout: 5000
    });

    return response.data;
  } catch (error) {
    return {
      error: 'Unable to fetch status',
      message: error.message
    };
  }
}

// Change container country
async function changeCountry(name, country) {
  const containers = await loadContainers();
  const config = containers[name];
  
  if (!config) {
    throw new Error(`Container ${name} not found`);
  }

  const axios = require('axios');
  const auth = await require('./config').getAuthConfig();
  
  // Get current IP before change
  let oldIp = null;
  try {
    const oldStatus = await getContainerStatus(name);
    oldIp = oldStatus.public_ip;
  } catch (error) {
    // Ignore if we can't get current IP
  }

  await axios.put(
    `http://localhost:${config.controlPort}/v1/vpn/settings`,
    {
      provider: {
        server_selection: {
          countries: [country.toLowerCase()]
        }
      }
    },
    {
      auth: auth,
      headers: { 'Content-Type': 'application/json' }
    }
  );

  // Update config
  containers[name].country = country;
  await saveContainers(containers);

  // Wait and verify reconnection (max 20 seconds)
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const newStatus = await getContainerStatus(name);
      if (newStatus.public_ip && newStatus.public_ip !== oldIp) {
        console.log(`VPN reconnected successfully. New IP: ${newStatus.public_ip}`);
        return newStatus;
      }
    } catch (error) {
      // Continue waiting
    }
  }

  // If we get here, reconnection took longer than expected
  console.log('VPN reconnection taking longer than expected, but change was submitted');
  return await getContainerStatus(name);
}

// Get all used ports
async function getUsedPorts() {
  const containers = await loadContainers();
  const ports = [];
  
  for (const config of Object.values(containers)) {
    ports.push(config.controlPort, config.proxyPort);
  }
  
  return ports;
}

module.exports = {
  listContainers,
  createContainer,
  deleteContainer,
  startContainer,
  stopContainer,
  getContainerStatus,
  changeCountry,
  getNextContainerName,
  getUsedPorts
};
