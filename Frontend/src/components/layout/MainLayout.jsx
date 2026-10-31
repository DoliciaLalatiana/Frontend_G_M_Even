import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'is-visible' : ''}`.trim()}
        onClick={() => setSidebarOpen(false)}
        role="presentation"
      />
      <div className="app-main">
        <Navbar onMenu={() => setSidebarOpen(true)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
