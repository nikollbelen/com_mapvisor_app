import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_USERS } from "../config/users";
import type { AppUser, UserRole } from "../types/auth";

const SESSION_KEY = "mapvisor_auth_session";

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isVendedor: boolean;
  canUseCotizador: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toAppUser = (record: (typeof DEMO_USERS)[number]): AppUser => ({
  id: record.id,
  email: record.email,
  full_name: record.full_name,
  role: record.role,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AppUser;
      const exists = DEMO_USERS.some((u) => u.id === parsed.id);
      if (exists) setUser(parsed);
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persistUser = useCallback((nextUser: AppUser | null) => {
    if (nextUser) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
    setUser(nextUser);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const normalized = normalizeEmail(email);
    const match = DEMO_USERS.find(
      (u) => normalizeEmail(u.email) === normalized && u.password === password
    );
    if (!match) return false;
    persistUser(toAppUser(match));
    return true;
  }, [persistUser]);

  const logout = useCallback(() => {
    persistUser(null);
  }, [persistUser]);

  const role = user?.role ?? null;

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      role,
      isAdmin: role === "admin",
      isVendedor: role === "vendedor",
      canUseCotizador: role === "vendedor" || role === "admin",
      login,
      logout,
    }),
    [user, isLoading, role, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};
