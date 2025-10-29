# Project Context: Gluetun Web Controller

## Project Goal
A **localhost-only** web interface to manage multiple Gluetun VPN containers on the same machine.

## User Workflow
1. User runs this web controller on their local machine (localhost:3030)
2. Creates multiple Gluetun Docker containers, each with:
   - Unique WireGuard VPN configuration
   - Unique proxy port (34000-34100 range)
   - Unique control port (33000-33100 range)
   - Country selection for VPN exit point
3. Other local services on the same machine connect to these proxy ports (e.g., `localhost:34001`) to route their traffic through different VPN locations
4. User can manage containers: start/stop, delete, change VPN country on-the-fly

## Architecture
- **Node.js/Express** backend serving static frontend
- **Dockerode** for Docker API communication
- **Gluetun** containers (qmcgaw/gluetun) with Surfshark WireGuard VPN
- **containers.json** stores configuration (control port, proxy port, country, WireGuard credentials)
- **config/auth.toml** stores auto-generated credentials for Gluetun control API

## Security Context
**This is NOT a production web service.** It runs exclusively on localhost for personal use:
- No external network exposure
- No authentication needed (localhost only)
- Credentials in logs are acceptable (local machine)
- Private keys in JSON files are acceptable (local filesystem)

## Focus Areas for Code Review
When reviewing this codebase, focus on:
1. **Functional bugs** - race conditions, state inconsistencies, resource leaks
2. **Reliability** - error handling, cleanup on failure, data corruption prevention
3. **Performance** - blocking I/O, unnecessary polling, resource usage
4. **Docker integration** - container lifecycle management, volume cleanup

## NOT Issues (for localhost use)
- Missing authentication/authorization
- Credentials in logs or JSON files
- No rate limiting
- No input sanitization for XSS
- Detailed error messages
- No CORS protection

## Key Files
- `server.js` - Express API endpoints
- `docker-manager.js` - Docker container operations
- `port-manager.js` - Port allocation logic
- `config.js` - Auth file generation
- `public/app.js` - Main dashboard frontend
- `public/create.js` - Container creation form
- `containers.json` - Persistent container configuration
