import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  RadioTower,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { APP_VERSION } from "../utils/constants";

const Login = () => {
  const { isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from || "/dashboard";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Renseignez votre adresse e-mail et votre mot de passe.");
      return;
    }

    const result = signIn({ email, password });
    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow--violet" />
      <div className="auth-glow auth-glow--cyan" />

      <div className="auth-shell">
        <section className="auth-brand">
          <div className="auth-brand__top">
            <div className="brand">
              <div className="brand__mark">
                <Boxes size={21} />
              </div>
              <div className="brand__text">
                <span className="brand__title">EVENT MANAGER</span>
                <span className="brand__subtitle">Logistics Core</span>
              </div>
            </div>
            <span className="live-pill">
              <span className="live-pill__dot" />
              PROD-FR01
            </span>
          </div>

          <div className="auth-brand__body">
            <span className="auth-kicker">
              <Sparkles size={12} />
              Console de pilotage événementiel
            </span>
            <h1>Le parc matériel sous contrôle, du dépôt au plateau.</h1>
            <p>
              Centralisez l'inventaire, les emprunts, les retours et les accès
              équipe dans une console unique conçue pour les régies exigeantes.
            </p>

            <div className="auth-features">
              <div className="auth-feature">
                <span className="auth-feature__icon">
                  <RadioTower size={17} />
                </span>
                <div>
                  <strong>Pilotage temps réel</strong>
                  <span>Stocks, départs et retours synchronisés.</span>
                </div>
              </div>
              <div className="auth-feature">
                <span className="auth-feature__icon">
                  <ShieldCheck size={17} />
                </span>
                <div>
                  <strong>Accès par rôle</strong>
                  <span>
                    Habilitations et console d'administration dédiées.
                  </span>
                </div>
              </div>
              <div className="auth-feature">
                <span className="auth-feature__icon">
                  <CheckCircle2 size={17} />
                </span>
                <div>
                  <strong>Traçabilité complète</strong>
                  <span>
                    Bons, incidents et exports archivés au même endroit.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-brand__foot">
            <span>Session locale sécurisée</span>
            <span>{APP_VERSION}</span>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel__head">
            <div className="auth-panel__icon">
              <KeyRound size={20} />
            </div>
            <span className="auth-panel__eyebrow">Accès sécurisé</span>
            <h2>Connexion à la console</h2>
            <p>
              Utilisez votre compte opérationnel pour reprendre la gestion du
              parc.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field" htmlFor="login-email">
              <span>Adresse e-mail</span>
              <div className="auth-input">
                <Mail size={14} />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  placeholder="prenom.nom@eventmanager.fr"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoFocus
                />
              </div>
            </label>

            <label className="auth-field" htmlFor="login-password">
              <span>Mot de passe</span>
              <div className="auth-input">
                <LockKeyhole size={14} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="auth-input__toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  title={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block auth-submit"
            >
              Se connecter
              <ArrowRight size={15} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
