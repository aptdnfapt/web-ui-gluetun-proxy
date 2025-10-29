# Gluetun Web Controller

A professional localhost-only web interface to manage multiple Gluetun VPN containers on the same machine.

## Project Goal

Manage unlimited VPN proxy containers with unique WireGuard configurations, allowing other local services to route traffic through different VPN locations.

## Features

- Create and manage multiple Gluetun Docker containers
- Automatic port allocation (control: 33000-33100, proxy: 34000-34100)
- Dynamic VPN country switching without container restart
- Real-time container status monitoring
- Clean, professional black-themed interface
- Container lifecycle management (start/stop/delete)
- WireGuard credential management

## Architecture

- **Backend**: Node.js/Express serving static frontend
- **Docker Integration**: Dockerode for container operations
- **Storage**: JSON-based configuration persistence
- **Security**: Localhost-only access (no external exposure)

## Installation

```bash
cd web-controller
npm install
```

## Usage

```bash
# Start the server
node server.js

# Or use nodemon for development
npm install -g nodemon
nodemon server.js
```

Open your browser to: `http://localhost:3030`

## Container Configuration

Each container gets:
- Unique container name
- Dedicated control port (33000-33100 range)
- Dedicated proxy port (34000-34100 range)
- WireGuard private key and address
- Default country selection
- Gluetun control API credentials

## Integration

Local services can connect to proxy ports:
- Example: `localhost:34001` routes traffic through first VPN container
- Use these proxy endpoints in applications, browsers, or other services

## File Structure

- `server.js` - Express API endpoints
- `docker-manager.js` - Docker container operations
- `port-manager.js` - Port allocation logic
- `config.js` - Auth file generation
- `public/` - Frontend assets
- `containers.json` - Container configuration storage

## Security Context

This is a localhost-only tool for personal use:
- No external network exposure
- No authentication required (localhost only)
- Acceptable to store credentials in local files
- Detailed error messages for local debugging

## Requirements

- Node.js
- Docker
- Gluetun Docker image (qmcgaw/gluetun)
- WireGuard VPN credentials (e.g., Surfshark)

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript
- **Styling**: Modern CSS with animations and gradients
- **Containerization**: Docker API integration
- **Storage**: File-based configuration management
