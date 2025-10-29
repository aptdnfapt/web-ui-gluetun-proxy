# Gluetun Web Controller

A simple web interface to control your Gluetun VPN proxy server.

## Features

- 🌍 Change VPN country with a single click
- 📊 View current IP, location, and connection status
- 🎨 Clean, responsive web interface
- 🚀 Easy to extend for multiple Gluetun servers

## Installation

```bash
cd web-controller
npm install
```

## Usage

```bash
# Start the server
node server.js

# Or use nodemon for auto-restart during development
npm install -g nodemon
nodemon server.js
```

Then open your browser to: `http://localhost:3000`

Or via Tailscale: `http://100.94.40.75:3000`

## Configuration

Edit `server.js` to change Gluetun connection settings:

```javascript
const GLUETUN_CONFIG = {
  host: 'http://localhost:8000',
  auth: {
    username: 'vpn-dashboard-user',
    password: 'your-password-here'
  }
};
```

## API Endpoints

- `GET /api/status` - Get current VPN status
- `POST /api/change-country` - Change VPN country
- `GET /api/countries` - Get list of available countries

## Future Enhancements

- Support for multiple Gluetun instances (10-20+)
- Dashboard view showing all proxies
- Bulk operations (change all servers to same country)
- Connection health monitoring
- Save/load country presets
- API key authentication

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Styling**: Pure CSS with gradients
