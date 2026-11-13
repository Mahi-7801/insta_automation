import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { get, post } from "./api.js";

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  refresh: async () => {},
  logout: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await get("/api/auth/me");
      setUser(data && data.user ? data.user : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await post("/api/auth/logout", {});
    } catch {}
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, refresh, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
