import axios from 'axios';

const api = axios.create({
    baseURL: 'https://social-network-h0kc.onrender.com/api',
    withCredentials: true,
});

export default api;
