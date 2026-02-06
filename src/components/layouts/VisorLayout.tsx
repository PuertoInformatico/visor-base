import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/features/Navbar';
import { Toaster } from "@/components/ui/sonner";

export const VisorLayout = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 flex flex-col">
                <Outlet />
            </main>
            <Toaster />
        </div>
    );

};