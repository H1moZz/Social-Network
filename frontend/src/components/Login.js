import React, { useState } from 'react';
import api from "../api"

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [username, setUsername] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('auth/login', { email, password },{
                headers:{
                    'Content-Type': 'application/json',
                }
            });
            const {access_token, username } = response.data;
            localStorage.setItem('token', access_token);
            setMessage('Login successful!');
            setUsername(username);
        } catch (error) {
            console.log(error);
            setMessage('Login failed: ' + error.response?.data?.message || 'Unknown error');
        }
    };

    return (
        <div>
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <label>Email:</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <label>Password:</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit">Login</button>
            </form>
            {message && <p>{message}</p>}
            {username && <p>Welcome, {username}!</p>}
        </div>
    );
}

export default Login;
