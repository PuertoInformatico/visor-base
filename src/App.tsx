import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Layouts
import { VisorLayout } from '@/components/layouts/VisorLayout';

// Pages
import { VisorPrincipalPage } from '@/pages/visor/VisorPrincipalPage';
import { NotFoundPage } from '@/pages/NotFountPage';

// Principal CSS
import './App.css';

// Routes
const router = createBrowserRouter([
    {
        path: '/',
        element: <VisorLayout />,
        children: [
            {
                index: true,
                element: <VisorPrincipalPage />,
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);

// App Component
export function App() {
    return <RouterProvider router={router} />;
}

export default App;