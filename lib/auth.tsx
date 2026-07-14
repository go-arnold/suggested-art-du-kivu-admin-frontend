"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, type User, type JWT, type RegisterPayload } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
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

  // Enregistre la session (tokens + user) — partagé par login / google / register.
  const persistSession = useCallback((jwt: JWT, fallback: Partial<User>) => {
    const loggedInUser: User = jwt.user ?? ({
      id: 0, email: "", username: "user", role: "viewer", ...fallback,
    } as User);

    localStorage.setItem("access_token", jwt.access);
    if (jwt.refresh) localStorage.setItem("refresh_token", jwt.refresh);
    localStorage.setItem("current_user", JSON.stringify(loggedInUser));

    setToken(jwt.access);
    setUser(loggedInUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const jwt = await authApi.login({ email, password });
    persistSession(jwt, { email, username: email.split("@")[0] });
  }, [persistSession]);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    const jwt = await authApi.google({ access_token: accessToken });
    persistSession(jwt, { username: "google_user" });
  }, [persistSession]);

  // Le backend connecte directement à l'inscription (renvoie un JWT).
  const register = useCallback(async (payload: RegisterPayload) => {
    const jwt = await authApi.register(payload);
    persistSession(jwt, { email: payload.email, username: payload.username });
  }, [persistSession]);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");
    setToken(null);
    setUser(null);
    authApi.logout().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
