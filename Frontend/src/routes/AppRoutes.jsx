import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react'
import MainLayout from '../components/layout/MainLayout'
import { RequireAdmin, RequireAuth } from './RouteGuards'
import Admin from '../pages/Admin'
import Categories from '../pages/Categories'
import Dashboard from '../pages/Dashboard'
import Emprunts from '../pages/Emprunts'
import Evenements from '../pages/Evenements'
import Login from '../pages/Login'
import Materiels from '../pages/Materiels'
import Parametres from '../pages/Parametres'
import Rapports from '../pages/Rapports'
import Reservations from '../pages/Reservations'
import Retours from '../pages/Retours'
import Utilisateurs from '../pages/Utilisateurs'

const NotFound = () => (
  <div className="notfound-page">
    <div className="glass-card notfound-card">
      <div className="notfound-code">404</div>
      <div className="notfound-title">Console introuvable</div>
      <p className="notfound-text">
        Cette route ne correspond à aucun module du parc. Revenez au tableau de bord pour reprendre le
        pilotage logistique.
      </p>
      <div className="notfound-actions">
        <Link className="btn btn-secondary" to="/dashboard">
          <LayoutDashboard size={14} />
          Tableau de bord
        </Link>
        <button type="button" className="btn btn-ghost" onClick={() => window.history.back()}>
          <ArrowLeft size={14} />
          Revenir en arrière
        </button>
      </div>
      <Compass size={18} className="muted" />
    </div>
  </div>
)

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

    <Route element={<RequireAuth />}>
      <Route element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/materiels" element={<Materiels />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/evenements" element={<Evenements />} />
        <Route path="/emprunts" element={<Emprunts />} />
        <Route path="/retours" element={<Retours />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/utilisateurs" element={<Utilisateurs />} />
        <Route path="/rapports" element={<Rapports />} />
        <Route path="/parametres" element={<Parametres />} />

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Route>
  </Routes>
)

export default AppRoutes
