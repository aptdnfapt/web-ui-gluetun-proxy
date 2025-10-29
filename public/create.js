// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCountries();
    autoPorts();
    autoName();
    suggestPrivateKey();
});

// Load countries
async function loadCountries() {
    try {
        const response = await fetch('/api/countries');
        const countries = await response.json();
        
        const select = document.getElementById('country');
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load countries:', error);
    }
}

// Auto-fill next available ports
async function autoPorts() {
    try {
        const response = await fetch('/api/ports/available');
        const ports = await response.json();
        
        document.getElementById('control-port').value = ports.controlPort;
        document.getElementById('proxy-port').value = ports.proxyPort;
    } catch (error) {
        console.error('Failed to get ports:', error);
    }
}

// Auto-fill next available name
async function autoName() {
    try {
        const response = await fetch('/api/containers/name/next');
        const data = await response.json();
        
        document.getElementById('container-name').value = data.name;
    } catch (error) {
        console.error('Failed to get name:', error);
    }
}

// Load existing private keys into dropdown
async function suggestPrivateKey() {
    try {
        // Fetch containers.json from root
        const response = await fetch('/containers.json');
        const configs = await response.json();
        
        const select = document.getElementById('key-selector');
        
        // Clear existing options except first
        select.innerHTML = '<option value="">-- Use existing --</option>';
        
        // Add option for each container
        for (const [name, config] of Object.entries(configs)) {
            if (config.privateKey) {
                const option = document.createElement('option');
                option.value = config.privateKey;
                option.textContent = `${name} (${config.country || 'Unknown country'})`;
                select.appendChild(option);
            }
        }
    } catch (error) {
        console.error('No existing containers found');
    }
}

// Use selected key from dropdown
function useSelectedKey() {
    const select = document.getElementById('key-selector');
    const privateKeyInput = document.getElementById('private-key');
    
    if (select.value) {
        privateKeyInput.value = select.value;
    }
}

// Handle form submission
document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const messageDiv = document.getElementById('message');
    
    // Get form values
    const name = document.getElementById('container-name').value.trim();
    const privateKey = document.getElementById('private-key').value.trim();
    const address = document.getElementById('address').value.trim();
    const country = document.getElementById('country').value;
    const controlPort = parseInt(document.getElementById('control-port').value);
    const proxyPort = parseInt(document.getElementById('proxy-port').value);
    
    // Validate
    if (!name || !privateKey || !address || !country) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    showMessage('Creating container... This may take a few seconds.', 'loading');
    
    try {
        const response = await fetch('/api/containers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                privateKey,
                address,
                country,
                controlPort,
                proxyPort
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage(`Success! Container ${name} created and started. Redirecting...`, 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showMessage(`Error: ${result.error}`, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create & Start Container';
        }
    } catch (error) {
        showMessage(`Error: ${error.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create & Start Container';
    }
});

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type;
}
