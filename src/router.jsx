import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import App from './App';

const router = createBrowserRouter([
    {
        path: '/',
        element: <HomePage />,
    },
    {
        path: '/three-body',
        element: <App />,
    },
], {
    basename: '/three_body_problem',
});

export default router;
