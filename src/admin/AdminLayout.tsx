import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { adminPassword, isAdminAuthed, setAdminAuthed } from '../lib/adminAuth'
import './admin.css'

const NAV_ITEMS: {
  to: string
  label: string
  icon: string
  end?: boolean
}[] = [
  { to: '/admin', label: 'Dashboard', end: true, icon: 'dashboard' },
  { to: '/admin/contacts', label: 'Contacts', icon: 'contacts' },
  { to: '/admin/lists', label: 'Lists', icon: 'lists' },
  { to: '/admin/tags', label: 'Tags', icon: 'tags' },
  { to: '/admin/automations', label: 'Automations', icon: 'automations' },
  { to: '/admin/email-test', label: 'Email Test', icon: 'email' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
]

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== adminPassword) {
      setLoginError('Incorrect password.')
      return
    }
    setAdminAuthed(true)
    setLoginError('')
    onSuccess()
  }

  return (
    <div className="fk-login">
      <div className="fk-login__card">
        <div className="fk-login__mark" aria-hidden="true" />
        <p className="fk-login__brand">SonicRing CRM</p>
        <h1>Sign in</h1>
        <p className="fk-muted">Enter your password to open the dashboard.</p>
        <form className="fk-login__form" onSubmit={handleLogin}>
          <label className="fk-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {loginError ? <p className="fk-error">{loginError}</p> : null}
          <button type="submit" className="fk-btn fk-btn--primary">
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}

function NavIcon({ name }: { name: string }) {
  return <span className={`fk-sideicon fk-sideicon--${name}`} aria-hidden="true" />
}

export function AdminLayout() {
  const [authed, setAuthed] = useState(isAdminAuthed)
  const navigate = useNavigate()
  const location = useLocation()
  const isBuilder = /^\/admin\/automations\/[^/]+$/.test(location.pathname)

  useEffect(() => {
    setAuthed(isAdminAuthed())
  }, [])

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />
  }

  const handleLogout = () => {
    setAdminAuthed(false)
    setAuthed(false)
    navigate('/admin')
  }

  return (
    <div className={`fk-app${isBuilder ? ' is-builder' : ''}`}>
      {!isBuilder ? (
        <aside className="fk-sidebar">
          <div className="fk-sidebar__brand">
            <span className="fk-sidebar__logo" aria-hidden="true" />
            <strong>SONICRING</strong>
          </div>

          <nav className="fk-sidebar__nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navClass}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="fk-sidebar__footer">
            <button type="button" className="fk-sidebar__signout" onClick={handleLogout}>
              <span className="fk-sideicon fk-sideicon--signout" aria-hidden="true" />
              Sign Out
            </button>
            <div className="fk-sidebar__user">
              <span className="fk-sidebar__avatar">A</span>
              <div>
                <strong>Admin</strong>
                <span>Owner</span>
              </div>
            </div>
          </div>
        </aside>
      ) : null}

      <div className="fk-shell">
        <main className={isBuilder ? 'fk-main fk-main--builder' : 'fk-main'}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'fk-sidenav is-active' : 'fk-sidenav'
}

export function AdminPageShell({
  title,
  count,
  actions,
  children,
  bare,
}: {
  title: string
  count?: number
  actions?: ReactNode
  children: ReactNode
  bare?: boolean
}) {
  if (bare) {
    return <div className="fk-page fk-page--bare">{children}</div>
  }

  return (
    <div className="fk-page">
      <div className="fk-page__header">
        <h1>
          {title}
          {typeof count === 'number' ? (
            <span className="fk-page__count"> ({count} Results)</span>
          ) : null}
        </h1>
        {actions ? <div className="fk-page__actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
