// Frontend configuration
const CONFIG = {
    // Backend API base URL - change this if your backend runs on a different port
    API_BASE_URL: 'http://localhost:5000',
    
    // Helper function to build API URLs
    apiUrl: (endpoint) => {
        // Remove leading slash if present to avoid double slashes
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${CONFIG.API_BASE_URL}/${cleanEndpoint}`;
    }
};

// Make CONFIG available globally
window.CONFIG = CONFIG;
