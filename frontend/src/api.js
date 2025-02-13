import axios from 'axios';

const api = axios.create({
    baseURL: 'http://192.168.3.88:3001',
    withCredentials: true,
});

export default api;
