import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

const originalFetch = window.fetch;
window.fetch = async (...args) => {
    let [resource, config] = args;
    if (typeof resource === 'string' && resource.startsWith('/api/') && resource !== '/api/login') {
        const savedUser = localStorage.getItem('autoparts_user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                if (user.token) {
                    config = config || {};
                    config.headers = {
                        ...config.headers,
                        'Authorization': `Bearer ${user.token}`
                    };
                }
            } catch (e) {
                // Ignore
            }
        }
    }
    const response = await originalFetch(resource, config);
    if (response.status === 401 && resource !== '/api/login') {
        localStorage.removeItem('autoparts_user');
        window.location.href = '/';
    }
    return response;
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);