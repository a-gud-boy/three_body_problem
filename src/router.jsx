import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ThreeBodyPage from './pages/ThreeBody/ThreeBodyPage';
import AtomSimulator from './pages/AtomSimulator/AtomSimulator';
import ElectromagneticPage from './pages/Electromagnetic/ElectromagneticPage';
import DoublePendulumPage from './pages/DoublePendulum/DoublePendulumPage';
import ConceptPage from './pages/Concept/ConceptPage';

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
    {
        path: '/double-pendulum',
        element: <DoublePendulumPage />,
    },
    {
        path: '/concept/:id',
        element: <ConceptPage />,
    },
], {
    basename: '/three_body_problem',
});

export default router;
