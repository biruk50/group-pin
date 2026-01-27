import React from "react";
import { Navigate } from "react-router-dom";

export default function Home() {
    const user = window.localStorage.getItem("user");
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to="/groups" replace />;
}
