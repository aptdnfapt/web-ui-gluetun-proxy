const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const CONFIG_DIR = path.join(__dirname, 'config');
const AUTH_FILE = path.join(CONFIG_DIR, 'auth.toml');

// Generate random password
function generatePassword(length = 32) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

// Generate random username
function generateUsername() {
  return `gluetun-user-${crypto.randomBytes(4).toString('hex')}`;
}

// Initialize config directory
async function initConfig() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

// Parse auth.toml to get credentials
async function parseAuthToml() {
  try {
    const content = await fs.readFile(AUTH_FILE, 'utf8');
    
    // Simple TOML parser for our specific format
    const usernameMatch = content.match(/username\s*=\s*"([^"]+)"/);
    const passwordMatch = content.match(/password\s*=\s*"([^"]+)"/);
    
    if (usernameMatch && passwordMatch) {
      return {
        username: usernameMatch[1],
        password: passwordMatch[1]
      };
    }
    
    throw new Error('Invalid auth.toml format');
  } catch (error) {
    return null;
  }
}

// Generate auth.toml file
async function generateAuthFile() {
  await initConfig();
  
  // Check if auth file already exists
  const existing = await parseAuthToml();
  if (existing) {
    return AUTH_FILE;
  }
  
  // Generate new credentials
  const username = generateUsername();
  const password = generatePassword();
  
  const tomlContent = `[[roles]]
name = "gluetun-manager"
routes = [
  "GET /v1/vpn/status",
  "PUT /v1/vpn/status",
  "GET /v1/vpn/settings",
  "PUT /v1/vpn/settings",
  "GET /v1/openvpn/status",
  "PUT /v1/openvpn/status",
  "GET /v1/openvpn/settings",
  "GET /v1/openvpn/portforwarded",
  "GET /v1/publicip/ip"
]
auth = "basic"
username = "${username}"
password = "${password}"
`;

  await fs.writeFile(AUTH_FILE, tomlContent);
  return AUTH_FILE;
}

// Get auth credentials
async function getAuthConfig() {
  await generateAuthFile(); // Ensure file exists
  const auth = await parseAuthToml();
  
  if (!auth) {
    throw new Error('Failed to read auth config');
  }
  
  return auth;
}

module.exports = {
  generateAuthFile,
  getAuthConfig,
  AUTH_FILE,
  CONFIG_DIR
};
