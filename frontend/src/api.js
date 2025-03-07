import axios from 'axios';

const api = axios.create({
    baseURL: 'https://social-network-ov7e.onrender.com',
    withCredentials: true,
});

export default api;
