import React, { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Login.css";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await api.get('auth/check_session', {
                    withCredentials: true,
                });
                if (response.data.is_authenticated) {
                    navigate('/chats');
                }
            } catch (error) {
                console.error("Ошибка при проверке сессии:", error);
            }
        };

        checkSession();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post(
                "auth/login",
                { email, password },
                {
                    headers: { "Content-Type": "application/json" },
                    withCredentials: true,
                }
            );

            console.log("Успешный вход", response);
            navigate("/chats"); 
        } catch (error) {
            console.log(error);
            setMessage("Ошибка входа: " + (error.response?.data?.message || "Неизвестная ошибка"));
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Login</h2>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-wrapper">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </div>
                    <div className="input-wrapper">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>
                    <button type="submit" className="cta">
                        <span>Login</span>
                        <svg width="15px" height="10px" viewBox="0 0 13 10">
                            <path d="M1,5 L11,5"></path>
                            <polyline points="8 1 12 5 8 9"></polyline>
                        </svg>
                    </button>
                </form>
                {message && <p className="error-message">{message}</p>}
            </div>
        </div>
    );
}

export default Login;
