import { createHashRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ThreeBodyPage from './pages/ThreeBody/ThreeBodyPage';
import AtomSimulator from './pages/AtomSimulator/AtomSimulator';
import ElectromagneticPage from './pages/Electromagnetic/ElectromagneticPage';
import DoublePendulumPage from './pages/DoublePendulum/DoublePendulumPage';
import FluidDynamicsPage from './pages/FluidDynamics/FluidDynamicsPage';
import WaveInterferencePage from './pages/WaveInterference/WaveInterferencePage';
import SoftBodyPage from './pages/SoftBody/SoftBodyPage';
import ConceptPage from './pages/Concept/ConceptPage';
import GeneralRelativityPage from './pages/GeneralRelativity/GeneralRelativityPage';
import QuantumSandboxPage from './pages/QuantumSandbox/QuantumSandboxPage';
import AerodynamicsPage from './pages/Aerodynamics/AerodynamicsPage';
import ThermodynamicsPage from './pages/Thermodynamics/ThermodynamicsPage';

const router = createHashRouter([
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
        path: '/fluid-dynamics',
        element: <FluidDynamicsPage />,
    },
    {
        path: '/wave-interference',
        element: <WaveInterferencePage />,
    },
    {
        path: '/soft-body',
        element: <SoftBodyPage />,
    },
    {
        path: '/general-relativity',
        element: <GeneralRelativityPage />,
    },
    {
        path: '/quantum-sandbox',
        element: <QuantumSandboxPage />,
    },
    {
        path: '/aerodynamics',
        element: <AerodynamicsPage />,
    },
    {
        path: '/thermodynamics',
        element: <ThermodynamicsPage />,
    },
    {
        path: '/concept/:id',
        element: <ConceptPage />,
    },
]);

export default router;
