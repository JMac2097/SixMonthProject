import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="appShell">
      <header className="topBar">
        <div className="topBarInner">
          <div className="brand">
            <div className="brandMark" aria-hidden="true" />
            <div>
              <div className="brandTitle">SyncLab</div>
              <div className="brandSubtitle">Trello → GitLab (manual sync)</div>
            </div>
          </div>
          <nav className="nav">
            <NavLink to="/rules" className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')}>
              Rules
            </NavLink>
            <NavLink
              to="/connections"
              className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')}
            >
              Connections
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

