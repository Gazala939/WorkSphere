
import { createContext, useContext, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function login(email, password) {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    localStorage.setItem("token", response.data.access_token);

    const profile = await api.get("/auth/me");
    setUser(profile.data);

    return profile.data;
  }

  async function register(username, email, password) {
    const response = await api.post("/auth/register", {
      username,
      email,
      password,
    });

    return response.data;
  }

  async function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
