import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const NotFoundPage = () => {
    const navigate = useNavigate();
    
    return (
        <div className="min-h-screen flex flex-col items-center justify-center space-y-6 text-center">
            <img 
                src="/img/404.svg" 
                alt="404 Not Found" 
                className="w-64 h-64 md:w-96 md:h-96"
            />
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter">¡Ups! Página no encontrada</h1>
                <p className="text-muted-foreground">
                Lo sentimos, la página que estás buscando no existe o ha sido movida.
                </p>
            </div>
            <Button 
                onClick={() => navigate('/')}
                size="lg"
            >
                Volver al inicio
            </Button>
        </div>
    );
}; 