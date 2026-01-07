import axios from 'axios';

// Security: Fail hard if VITE_API_URL is missing in production to avoid accidentally
// hitting localhost or an undefined endpoint.
const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL && import.meta.env.PROD) {
    console.error("CRITICAL: VITE_API_URL is not defined in production environment.");
}

const api = axios.create({
    baseURL: baseURL || '/api', // Fallback for strict proxy setups, but never 'localhost'
    timeout: 10000, // 10s timeout
});

export default api;
