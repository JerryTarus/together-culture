// Frontend configuration
const CONFIG = {
    // Backend API base URL - change this if your backend runs on a different port
    API_BASE_URL: window.location.protocol + '//' + window.location.hostname + ':5000',
    
    // Helper function to build API URLs
    apiUrl: (endpoint) => {
        try {
            // Remove leading slash if present to avoid double slashes
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
            return `${CONFIG.API_BASE_URL}/${cleanEndpoint}`;
        } catch (error) {
            console.error('Error building API URL:', error);
            // Fallback
            return `http://localhost:5000/${endpoint}`;
        }
    }
};

// Make CONFIG available globally
window.CONFIG = CONFIG;

// Debug logging
console.log('CONFIG loaded:', CONFIG);
console.log('API Base URL:', CONFIG.API_BASE_URL);

// Test connectivity function
CONFIG.testConnection = async () => {
    try {
        const response = await fetch(CONFIG.apiUrl('api/admin/stats'), {
            method: 'GET',
            credentials: 'include'
        });
        console.log('Server connectivity test:', response.status === 401 ? 'OK (auth required)' : `Status: ${response.status}`);
        return true;
    } catch (error) {
        console.error('Server connectivity test failed:', error);
        return false;
    }
};

// Auto-test connection when config loads
setTimeout(() => {
    CONFIG.testConnection();
}, 1000);
