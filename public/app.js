// Load containers on page load
document.addEventListener('DOMContentLoaded', () => {
    loadContainers();
    // Refresh every 10 seconds
    setInterval(loadContainers, 10000);
});

async function loadContainers() {
    const containersList = document.getElementById('containers-list');
    
    try {
        const response = await fetch('/api/containers');
        const containers = await response.json();
        
        if (containers.length === 0) {
            containersList.innerHTML = '<div class="loading">No containers yet. Create your first one!</div>';
            updateStats(0, 0, 0);
            return;
        }
        
        // Update stats
        const running = containers.filter(c => c.state === 'running').length;
        const stopped = containers.filter(c => c.state !== 'running').length;
        updateStats(containers.length, running, stopped);
        
        // Render containers
        containersList.innerHTML = '';
        for (const container of containers) {
            const card = await createContainerCard(container);
            containersList.appendChild(card);
        }
    } catch (error) {
        containersList.innerHTML = `<div class="message error">Error: ${error.message}</div>`;
    }
}

async function createContainerCard(container) {
    const card = document.createElement('div');
    card.className = `container-card ${container.state}`;
    
    // Get status info if running
    let statusInfo = null;
    if (container.state === 'running') {
        try {
            const response = await fetch(`/api/containers/${container.name}`);
            statusInfo = await response.json();
        } catch (error) {
            console.error('Failed to get status:', error);
        }
    }
    
    const statusBadgeClass = container.state === 'running' ? 'running' : 'stopped';
    const statusText = container.state === 'running' ? 'Running' : 'Stopped';
    
    card.innerHTML = `
        <div class="container-header">
            <div class="container-name">${container.name}</div>
            <span class="status-badge ${statusBadgeClass}">${statusText}</span>
        </div>
        
        ${statusInfo && !statusInfo.error ? `
        <div class="container-info">
            <div class="info-item">
                <div class="info-label">Public IP</div>
                <div class="info-value">${statusInfo.public_ip || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Country</div>
                <div class="info-value">${statusInfo.country || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">City</div>
                <div class="info-value">${statusInfo.city || 'N/A'}${statusInfo.region ? ', ' + statusInfo.region : ''}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Organization</div>
                <div class="info-value">${statusInfo.organization || 'N/A'}</div>
            </div>
        </div>
        ` : ''}
        
        <div class="container-info">
            <div class="info-item">
                <div class="info-label">Control Port</div>
                <div class="info-value">${container.controlPort || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Proxy Port</div>
                <div class="info-value">${container.proxyPort || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Default Country</div>
                <div class="info-value">${container.country || 'N/A'}</div>
            </div>
        </div>
        
        ${container.state === 'running' ? `
        <div class="country-change">
            <select id="country-${container.name}">
                <option value="">-- Change Country --</option>
            </select>
            <button class="btn-primary" onclick="changeCountry('${container.name}')">Change</button>
        </div>
        ` : ''}
        
        <div class="container-actions">
            ${container.state === 'running' ? `
                <button class="btn-secondary" onclick="stopContainer('${container.name}')">Stop</button>
            ` : `
                <button class="btn-primary" onclick="startContainer('${container.name}')">Start</button>
            `}
            <button class="btn-danger" onclick="deleteContainer('${container.name}')">Delete</button>
        </div>
    `;
    
    // Load countries for the dropdown if running
    if (container.state === 'running') {
        loadCountriesForSelect(`country-${container.name}`);
    }
    
    return card;
}

async function loadCountriesForSelect(selectId) {
    try {
        const response = await fetch('/api/countries');
        const countries = await response.json();
        
        const select = document.getElementById(selectId);
        if (select) {
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load countries:', error);
    }
}

function updateStats(total, running, stopped) {
    document.getElementById('total-containers').textContent = total;
    document.getElementById('running-containers').textContent = running;
    document.getElementById('stopped-containers').textContent = stopped;
}

async function startContainer(name) {
    try {
        const response = await fetch(`/api/containers/${name}/start`, { method: 'POST' });
        const result = await response.json();
        
        if (response.ok) {
            showToast(`${name} started successfully`, 'success');
            setTimeout(loadContainers, 2000);
        } else {
            showToast(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function stopContainer(name) {
    if (!confirm(`Stop container ${name}?`)) return;
    
    try {
        const response = await fetch(`/api/containers/${name}/stop`, { method: 'POST' });
        const result = await response.json();
        
        if (response.ok) {
            showToast(`${name} stopped successfully`, 'success');
            setTimeout(loadContainers, 2000);
        } else {
            showToast(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function deleteContainer(name) {
    if (!confirm(`Delete container ${name}? This cannot be undone!`)) return;
    
    try {
        const response = await fetch(`/api/containers/${name}`, { method: 'DELETE' });
        const result = await response.json();
        
        if (response.ok) {
            showToast(`${name} deleted successfully`, 'success');
            loadContainers();
        } else {
            showToast(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function changeCountry(name) {
    const select = document.getElementById(`country-${name}`);
    const country = select.value;
    
    if (!country) {
        showToast('Please select a country', 'error');
        return;
    }
    
    if (!confirm(`Change ${name} to ${country}? This will reconnect the VPN.`)) return;
    
    showToast(`Changing ${name} to ${country}... Please wait.`, 'loading');
    
    try {
        const response = await fetch(`/api/containers/${name}/country`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(`${name} changed to ${country} successfully!`, 'success');
            setTimeout(loadContainers, 3000);
        } else {
            showToast(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

function showToast(message, type) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `message ${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '1000';
    toast.style.minWidth = '300px';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}
