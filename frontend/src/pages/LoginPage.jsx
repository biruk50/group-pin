import React, { useRef, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../components/login.css";

export default function LoginPage() {
    const usernameRef = useRef();
    const passwordRef = useRef();
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = {
            username: usernameRef.current.value,
            password: passwordRef.current.value,
        };
        try {
            const res = await axios.post("/users/login", user);
            window.localStorage.setItem("user", res.data.username);
            navigate("/groups");
        } catch (err) {
            setError(true);
        }
    };

    return (
        <div className="pageContainer">
            <div className="authCard">
                <div className="logo">
                    <span className="logoIcon" aria-hidden>
                        📍
                    </span>
                    <span> Group Pin </span>
                </div>
                <form onSubmit={handleSubmit} className="authForm">
                    <input autoFocus placeholder="username" ref={usernameRef} />
                    <input type="password" min="6" placeholder="password" ref={passwordRef} />
                    <button className="primaryBtn" type="submit">
                        Login
                    </button>
                    {error && <span className="failure">Invalid credentials</span>}
                </form>
                <div className="authFooter">
                    <span>Don't have an account?</span>
                    <Link to="/register" className="linkBtn">Register</Link>
                </div>
            </div>
        </div>
    );
}
