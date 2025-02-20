import io from 'socket.io-client';
import api from '../api';

const socket = io(api.getUri(), { transports: ['websocket'] });

export default socket;