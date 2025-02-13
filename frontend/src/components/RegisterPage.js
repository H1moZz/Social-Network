import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Login.css";

const RegisterPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        if (password !== confirmPassword) {
            setErrorMessage("Пароли не совпадают!");
            return;
        }

        try {
            const response = await api.post("/api/auth/registration", {
                email,
                password,
                username
            });
            setSuccessMessage("Регистрация успешна! Перенаправление...");
            setTimeout(() => navigate("/login"), 2000);
        } catch (error) {
            setErrorMessage("Ошибка регистрации. Попробуйте снова.");
            console.error("Ошибка:", error);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Регистрация</h2>
                <form className="login-form" onSubmit={handleRegister}>
                <div className="input-wrapper">
                        <input
                            type="Имя пользователя"
                            value={username}
                            placeholder="Krutoy pacan"
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-wrapper">
                        <input
                            type="email"
                            value={email}
                            placeholder="Почта: mail@gmail.com"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-wrapper">
                        <input
                            type="password"
                            placeholder="Введите свой пароль"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-wrapper">
                        <input
                            type="password"
                            value={confirmPassword}
                            placeholder="Повторите свой пароль"
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    {errorMessage && <p className="error-message">
                        {errorMessage}
                        </p>}
                    {successMessage && <p className="welcome-message">{successMessage}</p>}
                    <button type="submit" className="cta">
                    <span>Регистрация</span>
                        <svg width="15px" height="10px" viewBox="0 0 13 10">
                            <path d="M1,5 L11,5"></path>
                            <polyline points="8 1 12 5 8 9"></polyline>
                        </svg>
                    </button>
                </form>
                <div className="register-link">
                    Уже есть аккаунт? <span onClick={() => navigate("/login")}>Войти</span>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
