const express = require('express');
const path = require('path');
const dockerManager = require('./docker-manager');
const portManager = require('./port-manager');
const appConfig = require('./config');

const app = express();
const PORT = 3030;

// Initialize auth config on startup
(async () => {
  try {
    await appConfig.generateAuthFile();
    const auth = await appConfig.getAuthConfig();
    console.log(`🔐 Auth config initialized`);
    console.log(`   Username: ${auth.username}`);
    console.log(`   Password: ${auth.password}`);
  } catch (error) {
    console.error('Failed to initialize auth config:', error);
  }
})();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve containers.json from parent directory
app.get('/containers.json', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const data = fs.readFileSync(path.join(__dirname, 'containers.json'), 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } catch (error) {
    res.status(404).json({ error: 'containers.json not found' });
  }
});

// ===== CONTAINER MANAGEMENT API =====

// List all Gluetun containers
app.get('/api/containers', async (req, res) => {
  try {
    const containers = await dockerManager.listContainers();
    res.json(containers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get container details with status
app.get('/api/containers/:name', async (req, res) => {
  try {
    const status = await dockerManager.getContainerStatus(req.params.name);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get next available ports
app.get('/api/ports/available', async (req, res) => {
  try {
    const usedPorts = await dockerManager.getUsedPorts();
    const controlPort = portManager.getNextControlPort(usedPorts);
    const proxyPort = portManager.getNextProxyPort(usedPorts);
    
    res.json({ controlPort, proxyPort });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get next available container name
app.get('/api/containers/name/next', async (req, res) => {
  try {
    const name = await dockerManager.getNextContainerName();
    res.json({ name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Create new container
app.post('/api/containers', async (req, res) => {
  try {
    const {
      name,
      privateKey,
      address,
      country,
      controlPort,
      proxyPort
    } = req.body;

    // Validate required fields
    if (!name || !privateKey || !address || !country) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, privateKey, address, country' 
      });
    }

    // Validate ports
    if (!portManager.isValidControlPort(controlPort)) {
      return res.status(400).json({ 
        error: `Control port must be between ${portManager.CONTROL_PORT_START} and ${portManager.CONTROL_PORT_END}` 
      });
    }

    if (!portManager.isValidProxyPort(proxyPort)) {
      return res.status(400).json({ 
        error: `Proxy port must be between ${portManager.PROXY_PORT_START} and ${portManager.PROXY_PORT_END}` 
      });
    }

    const result = await dockerManager.createContainer({
      name,
      privateKey,
      address,
      country,
      controlPort: parseInt(controlPort),
      proxyPort: parseInt(proxyPort)
    });

    res.json({ 
      success: true, 
      message: `Container ${name} created and started`,
      ...result 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start container
app.post('/api/containers/:name/start', async (req, res) => {
  try {
    await dockerManager.startContainer(req.params.name);
    res.json({ success: true, message: `Container ${req.params.name} started` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop container
app.post('/api/containers/:name/stop', async (req, res) => {
  try {
    await dockerManager.stopContainer(req.params.name);
    res.json({ success: true, message: `Container ${req.params.name} stopped` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete container
app.delete('/api/containers/:name', async (req, res) => {
  try {
    await dockerManager.deleteContainer(req.params.name);
    res.json({ success: true, message: `Container ${req.params.name} deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change container country
app.post('/api/containers/:name/country', async (req, res) => {
  try {
    const { country } = req.body;
    
    if (!country) {
      return res.status(400).json({ error: 'Country is required' });
    }

    const result = await dockerManager.changeCountry(req.params.name, country);
    res.json({ 
      success: true, 
      message: `Changed ${req.params.name} to ${country}`,
      status: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get list of countries
app.get('/api/countries', (req, res) => {
  const countries = [
    'Albania',
    'Argentina',
    'Australia',
    'Austria',
    'Belgium',
    'Bosnia and Herzegovina',
    'Brazil',
    'Bulgaria',
    'Canada',
    'Chile',
    'Colombia',
    'Costa Rica',
    'Croatia',
    'Cyprus',
    'Czech Republic',
    'Denmark',
    'Egypt',
    'Estonia',
    'Finland',
    'France',
    'Germany',
    'Greece',
    'Hong Kong',
    'Hungary',
    'Iceland',
    'India',
    'Indonesia',
    'Ireland',
    'Israel',
    'Italy',
    'Japan',
    'Kazakhstan',
    'Latvia',
    'Lithuania',
    'Luxembourg',
    'Malaysia',
    'Mexico',
    'Moldova',
    'Netherlands',
    'New Zealand',
    'Nigeria',
    'North Macedonia',
    'Norway',
    'Paraguay',
    'Philippines',
    'Poland',
    'Portugal',
    'Romania',
    'Serbia',
    'Singapore',
    'Slovakia',
    'Slovenia',
    'South Africa',
    'South Korea',
    'Spain',
    'Sweden',
    'Switzerland',
    'Taiwan',
    'Thailand',
    'Turkey',
    'UAE',
    'Ukraine',
    'United Kingdom',
    'United States',
    'Venezuela',
    'Vietnam'
  ];
  res.json(countries);
});

app.listen(PORT, () => {
  console.log(`🚀 Gluetun Multi-Container Manager running on http://localhost:${PORT}`);
  console.log(`📡 Managing Gluetun containers with Docker API`);
  console.log(`🔧 Control ports: ${portManager.CONTROL_PORT_START}-${portManager.CONTROL_PORT_END}`);
  console.log(`🌐 Proxy ports: ${portManager.PROXY_PORT_START}-${portManager.PROXY_PORT_END}`);
});
