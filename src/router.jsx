import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ThreeBodyPage from './pages/ThreeBody/ThreeBodyPage';
import AtomSimulator from './pages/AtomSimulator/AtomSimulator';
import ElectromagneticPage from './pages/Electromagnetic/ElectromagneticPage';

const router = createBrowserRouter([
    {
        path: '/',
        element: <HomePage />,
    },
    {
        path: '/three-body',
        element: <ThreeBodyPage />,
    },
    {
        path: '/atom-simulator',
        element: <AtomSimulator />,
    },
    {
        path: '/electromagnetic',
        element: <ElectromagneticPage />,
    },
], {
    basename: '/three_body_problem',
});

export default router;
