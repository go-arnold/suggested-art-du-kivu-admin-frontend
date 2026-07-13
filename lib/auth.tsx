"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, type User } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    const storedUser  = localStorage.getItem("current_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as User);
      } catch {
        // Corrupted data — clear
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("current_user");
      }
      setLoading(false);
    } else if (storedToken) {
      // Token exists but no cached user — fetch from /auth/me/
      setToken(storedToken);
      authApi
        .me()
        .then((u) => {
          setUser(u);
          localStorage.setItem("current_user", JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("current_user");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const jwt = await authApi.login({ email, password });

    // The login response includes the user object directly
    const loggedInUser: User = jwt.user ?? ({
      id: 0,
      email,
      username: email.split("@")[0],
      role: "viewer",
    } as User);

    localStorage.setItem("access_token",  jwt.access);
    if (jwt.refresh) localStorage.setItem("refresh_token", jwt.refresh);
    localStorage.setItem("current_user",  JSON.stringify(loggedInUser));

    setToken(jwt.access);
    setUser(loggedInUser);
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    const jwt = await authApi.google({ access_token: accessToken });

    const loggedInUser: User = jwt.user ?? ({
      id: 0,
      email: "",
      username: "google_user",
      role: "viewer",
    } as User);

    localStorage.setItem("access_token", jwt.access);
    if (jwt.refresh) localStorage.setItem("refresh_token", jwt.refresh);
    localStorage.setItem("current_user", JSON.stringify(loggedInUser));

    setToken(jwt.access);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");
    setToken(null);
    setUser(null);
    authApi.logout().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
