// API base URL - use relative URLs in production, localhost in development
const API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

export default API_BASE_URL;