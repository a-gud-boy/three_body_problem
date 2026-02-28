import React, { Suspense } from 'react';
import { createHashRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Layout from './components/Layout';
import SuspenseFallback from './components/SuspenseFallback';

// Lazy load all simulation pages to reduce initial bundle size
const ThreeBodyPage = React.lazy(() => import('./pages/ThreeBody/ThreeBodyPage'));
const AtomSimulator = React.lazy(() => import('./pages/AtomSimulator/AtomSimulator'));
const ElectromagneticPage = React.lazy(() => import('./pages/Electromagnetic/ElectromagneticPage'));
const DoublePendulumPage = React.lazy(() => import('./pages/DoublePendulum/DoublePendulumPage'));
const FluidDynamicsPage = React.lazy(() => import('./pages/FluidDynamics/FluidDynamicsPage'));
const WaveInterferencePage = React.lazy(() => import('./pages/WaveInterference/WaveInterferencePage'));
const SoftBodyPage = React.lazy(() => import('./pages/SoftBody/SoftBodyPage'));
const ConceptPage = React.lazy(() => import('./pages/Concept/ConceptPage'));
const GeneralRelativityPage = React.lazy(() => import('./pages/GeneralRelativity/GeneralRelativityPage'));
const QuantumSandboxPage = React.lazy(() => import('./pages/QuantumSandbox/QuantumSandboxPage'));
const AerodynamicsPage = React.lazy(() => import('./pages/Aerodynamics/AerodynamicsPage'));
const ThermodynamicsPage = React.lazy(() => import('./pages/Thermodynamics/ThermodynamicsPage'));

const router = createHashRouter([
    {
        element: <Layout />,
        children: [
            {
                path: '/',
                element: <HomePage />,
            },
            {
                path: '/three-body',
                element: <Suspense fallback={<SuspenseFallback />}><ThreeBodyPage /></Suspense>,
            },
            {
                path: '/atom-simulator',
                element: <Suspense fallback={<SuspenseFallback />}><AtomSimulator /></Suspense>,
            },
            {
                path: '/electromagnetic',
                element: <Suspense fallback={<SuspenseFallback />}><ElectromagneticPage /></Suspense>,
            },
            {
                path: '/double-pendulum',
                element: <Suspense fallback={<SuspenseFallback />}><DoublePendulumPage /></Suspense>,
            },
            {
                path: '/fluid-dynamics',
                element: <Suspense fallback={<SuspenseFallback />}><FluidDynamicsPage /></Suspense>,
            },
            {
                path: '/wave-interference',
                element: <Suspense fallback={<SuspenseFallback />}><WaveInterferencePage /></Suspense>,
            },
            {
                path: '/soft-body',
                element: <Suspense fallback={<SuspenseFallback />}><SoftBodyPage /></Suspense>,
            },
            {
                path: '/general-relativity',
                element: <Suspense fallback={<SuspenseFallback />}><GeneralRelativityPage /></Suspense>,
            },
            {
                path: '/quantum-sandbox',
                element: <Suspense fallback={<SuspenseFallback />}><QuantumSandboxPage /></Suspense>,
            },
            {
                path: '/aerodynamics',
                element: <Suspense fallback={<SuspenseFallback />}><AerodynamicsPage /></Suspense>,
            },
            {
                path: '/thermodynamics',
                element: <Suspense fallback={<SuspenseFallback />}><ThermodynamicsPage /></Suspense>,
            },
            {
                path: '/concept/:id',
                element: <Suspense fallback={<SuspenseFallback />}><ConceptPage /></Suspense>,
            },
        ],
    },
]);

export default router;
