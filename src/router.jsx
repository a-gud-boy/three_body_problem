import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import App from './App';
import AtomSimulator from './pages/AtomSimulator/AtomSimulator';

const router = createBrowserRouter([
    {
        path: '/',
        element: <HomePage />,
    },
    {
        path: '/three-body',
        element: <App />,
    },
    {
        path: '/atom-simulator',
        element: <AtomSimulator />,
    },
], {
    basename: '/three_body_problem',
});

export default router;
