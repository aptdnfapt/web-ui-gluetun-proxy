const CONTROL_PORT_START = 33000;
const CONTROL_PORT_END = 33100;
const PROXY_PORT_START = 34000;
const PROXY_PORT_END = 34100;

// Find next available control port
function getNextControlPort(usedPorts) {
  for (let port = CONTROL_PORT_START; port <= CONTROL_PORT_END; port++) {
    if (!usedPorts.includes(port)) {
      return port;
    }
  }
  throw new Error('No available control ports in range 33000-33100');
}

// Find next available proxy port
function getNextProxyPort(usedPorts) {
  for (let port = PROXY_PORT_START; port <= PROXY_PORT_END; port++) {
    if (!usedPorts.includes(port)) {
      return port;
    }
  }
  throw new Error('No available proxy ports in range 34000-34100');
}

// Validate port is in allowed range
function isValidControlPort(port) {
  return port >= CONTROL_PORT_START && port <= CONTROL_PORT_END;
}

function isValidProxyPort(port) {
  return port >= PROXY_PORT_START && port <= PROXY_PORT_END;
}

module.exports = {
  getNextControlPort,
  getNextProxyPort,
  isValidControlPort,
  isValidProxyPort,
  CONTROL_PORT_START,
  CONTROL_PORT_END,
  PROXY_PORT_START,
  PROXY_PORT_END
};
