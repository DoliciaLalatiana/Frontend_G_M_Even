
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { backendApi, tokenStore } from "../services/backendApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurer la session lors du rechargement de la page
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      if (!tokenStore.access()) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await backendApi.auth.me();

        if (!cancelled) {
          setUser(currentUser);
          setSession({
            loginAt: new Date().toISOString(),
            method: "jwt",
          });
        }
      } catch {
        tokenStore.clear();

        if (!cancelled) {
          setUser(null);
          setSession(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Connexion réelle via Django JWT
  const signIn = useCallback(async ({ email, password }) => {
    try {
      const response = await backendApi.auth.login(
        email.trim().toLowerCase(),
        password
      );

      const currentUser = response.user || await backendApi.auth.me();

      if (currentUser.is_active === false) {
        tokenStore.clear();
        return {
          ok: false,
          message: "Ce compte est désactivé.",
        };
      }

      setUser(currentUser);
      setSession({
        loginAt: new Date().toISOString(),
        method: "jwt",
      });

      return { ok: true, user: currentUser };
    } catch (error) {
      return {
        ok: false,
        message: error.message || "Échec de la connexion.",
      };
    }
  }, []);

  const signOut = useCallback(() => {
    backendApi.auth.logout();
    setUser(null);
    setSession(null);
  }, []);

  const hasHabilitation = useCallback(
    (habilitation) =>
      Boolean(user?.habilitations?.includes(habilitation)),
    [user]
  );

  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin:
        user?.role?.toLowerCase() === "administrateur" ||
        user?.role?.toLowerCase() === "admin",
      isActive: user?.statut === "Actif" && user?.is_active !== false,
      signIn,
      signOut,
      hasHabilitation,
    }),
    [session, user, isLoading, signIn, signOut, hasHabilitation]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth doit être utilisé dans AuthProvider");
  }

  return context;
};
