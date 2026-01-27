import React, { useRef, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../components/register.css";

export default function RegisterPage() {
    const usernameRef = useRef();
    const emailRef = useRef();
    const passwordRef = useRef();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newUser = {
            username: usernameRef.current.value,
            email: emailRef.current.value,
            password: passwordRef.current.value,
        };

        try {
            await axios.post("/users/register", newUser);
            setError(false);
            setSuccess(true);
            setTimeout(() => navigate("/login"), 1200);
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
                    <span>Group Pin</span>
                </div>
                <form onSubmit={handleSubmit} className="authForm">
                    <input autoFocus placeholder="username" ref={usernameRef} />
                    <input type="email" placeholder="email" ref={emailRef} />
                    <input type="password" min="6" placeholder="password" ref={passwordRef} />
                    <button className="primaryBtn" type="submit">
                        Register
                    </button>
                    {success && <span className="success">Registered — redirecting...</span>}
                    {error && <span className="failure">Something went wrong!</span>}
                </form>
                <div className="authFooter">
                    <span>Already have an account?</span>
                    <Link to="/login" className="linkBtn">Login</Link>
                </div>
            </div>
        </div>
    );
}
