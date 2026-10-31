import { createContext, useCallback, useContext, useMemo } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { useData } from "./DataContext";

const AuthContext = createContext(null);

const DEMO_PASSWORDS = {
  Administrateur: ["admin123", "admin1234#"],
  Régisseur: ["user123", "user1234#"],
  default: ["user123", "user1234#"],
};

export const AuthProvider = ({ children }) => {
  const { utilisateurs } = useData();
  const [session, setSession, resetSession] = usePersistentState(
    "session",
    null,
  );

  const user = useMemo(
    () =>
      utilisateurs.find((utilisateur) => utilisateur.id === session?.userId) ||
      null,
    [session, utilisateurs],
  );

  const signIn = useCallback(
    ({ email, password }) => {
      const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();
      const candidate = utilisateurs.find(
        (utilisateur) => utilisateur.email.toLowerCase() === normalizedEmail,
      );

      if (!candidate) {
        return {
          ok: false,
          message: "Aucun compte ne correspond à cette adresse e-mail.",
        };
      }

      if (candidate.statut !== "Actif") {
        return {
          ok: false,
          message: `Ce compte est ${candidate.statut.toLowerCase()}. Contactez un administrateur.`,
        };
      }

      const allowedPasswords =
        DEMO_PASSWORDS[candidate.role] || DEMO_PASSWORDS.default;
      const passwordMatches = Array.isArray(allowedPasswords)
        ? allowedPasswords.includes(String(password))
        : String(password) === allowedPasswords;

      if (!passwordMatches) {
        return {
          ok: false,
          message: "Mot de passe incorrect. Vérifiez vos identifiants.",
        };
      }

      setSession({
        userId: candidate.id,
        loginAt: new Date().toISOString(),
        method: "demo-local",
      });

      return { ok: true, user: candidate };
    },
    [setSession, utilisateurs],
  );

  const signOut = useCallback(() => {
    resetSession();
  }, [resetSession]);

  const hasHabilitation = useCallback(
    (habilitation) => Boolean(user?.habilitations?.includes(habilitation)),
    [user],
  );

  const value = useMemo(
    () => ({
      session,
      user,
      isAuthenticated: Boolean(session && user),
      isAdmin: user?.role === "Administrateur",
      isActive: user?.statut === "Actif",
      signIn,
      signOut,
      hasHabilitation,
    }),
    [hasHabilitation, session, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return context;
};
