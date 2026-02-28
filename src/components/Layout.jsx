import { Outlet, useLocation, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const backButtonStyle = {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 1rem',
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'all 0.2s',
};

export default function Layout() {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <>
            {!isHome && (
                <Link to="/" style={backButtonStyle} className="layout-back-btn">
                    <ArrowLeft size={16} />
                    Home
                </Link>
            )}
            <Outlet />
        </>
    );
}
