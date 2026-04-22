import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

export default function DelivererLayout() {
  const { user, logout } = useAuth()
  const { t, toggleLang, lang } = useLang()

  const links = [
    { to: '/deliverer', label: t('dashboard'), end: true },
    { to: '/deliverer/clients', label: t('myClients') },
    { to: '/deliverer/orders', label: t('myOrders') },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">{t('appName')}</h1>
          <p className="text-gray-400 text-xs mt-1">{t('delivererPanel')}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700 space-y-2">
          <p className="text-gray-400 text-xs truncate">{user?.name}</p>
          <button
            onClick={toggleLang}
            className="w-full px-4 py-1.5 border border-gray-600 text-gray-300 hover:bg-gray-800 text-xs rounded-lg transition-colors font-medium"
          >
            {lang === 'en' ? '🇫🇷 Français' : '🇬🇧 English'}
          </button>
          <button
            onClick={logout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
          >
            {t('logout')}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
