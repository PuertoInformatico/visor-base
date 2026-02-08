import { useState } from "react";
import { Link } from 'react-router-dom';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,  
  SheetTitle
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from '@/components/ui/button';

import { IconMenu2, IconX } from '@tabler/icons-react';

// Item
interface NavItem {
    label: string;
    href: string;
    description: string;
    children: NavChildItem[];
}

// Subitem
interface NavChildItem {
    label: string;
    href: string;
    description: string;
}

export const Navbar = () => {
  
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems: NavItem[] = [
        {
            label: "Visor",
            href: "/",
            description: "",
            children: []
        },
        {
            label: "Servicios",
            href: "#",
            description: "",
            children: [       
                {
                    label: "Recepción de denuncias", 
                    href: "/servicios/denuncias", 
                    description: "",
                },
                {
                    label: "asdasdass", 
                    href: "/servicios/denuncias", 
                    description: "",
                }
            ]
        },
        {
            label: "Nosotros",
            href: "#",
            description: "",
            children: [
                {
                    label: "¿Qué es el ?", 
                    href: "/nosotros/cur", 
                    description: "Conoce más sobre la plataforma",
                },
                {
                    label: "Implementación del ", 
                    href: "/nosotros/implementacion",
                    description: "Conoce acerca del proceso de implementación",
                }
            ]
        },
    ];

    return (
        <nav className="w-full bg-white px-2 lg:px-6 py-2 flex justify-between items-center z-1">
                <Link to="/">
                    {/* LOGO PRINCIPAL */}
                    <img src="/img/logo_principal.png" alt="" className="h-8 sm:h-10 w-auto object-contain logo_principal" />
                </Link>
                <div className="hidden lg:block">
                    {/* MENU DESKTOP */}
                    <NavigationMenu viewport={false}>
                        <NavigationMenuList>
                            {navItems.map((item) => (                               
                                item.children.length > 0 ? (
                                    <NavigationMenuItem key={item.label}>
                                        <NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
                                        <NavigationMenuContent>
                                            <ul className="w-76 p-1">                                                
                                                {item.children.map((child) => (
                                                    <NavigationMenuLink key={child.label} asChild>
                                                        <Link to={child.href} className="block">
                                                            <div className="flex flex-col gap-1 text-sm">
                                                                <div className="font-medium leading-none">{child.label}</div>
                                                                {child.description !== "" && (
                                                                    <div className="text-muted-foreground line-clamp-2">
                                                                        {child.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Link>
                                                    </NavigationMenuLink>
                                                ))}
                                            </ul>
                                        </NavigationMenuContent>
                                    </NavigationMenuItem>
                                ) : (
                                    <NavigationMenuItem key={item.label}>
                                        <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                                            <Link to={item.href}>{item.label}</Link>                        
                                        </NavigationMenuLink>
                                    </NavigationMenuItem>
                                )
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>  
                </div>
                <div className="flex items-center">    
                    {/* USER BOTON / INFO */}
                    <Button variant="default" className="">
                        <Link to="/login" className="flex items-center">
                            Ingresar 
                        </Link>
                    </Button>
                    {/* MENU MOBILE */}
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="secondary" className="ml-2 lg:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                                <IconMenu2 className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-64 p-4 gap-2 [&>button:first-of-type]:hidden">
                            <div className="flex justify-between items-center">
                                <SheetTitle className="sr-only">Menu</SheetTitle>
                                <div className="text-lg">Menu</div>
                                <Button variant="secondary" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                                    <IconX className="w-5 h-5" />
                                </Button>
                            </div>
                            <Separator className="my-0" />
                            <div className="flex flex-col gap-1">
                                {navItems.map((item) => (
                                    <div key={item.label}>
                                    <Link
                                        to={item.href}
                                        className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-colors hover:bg-gray-300 hover:text-gray-900 focus-visible:ring-2 active:bg-gray-300 active:text-gray-900 font-medium"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                    {item.children.length > 0 && (
                                        <ul className="border-l border-gray-300 ml-3.5 flex flex-col gap-1 pl-2.5 py-0.5">
                                            {item.children.map((child) => (
                                                <li key={child.label}>
                                                <Link
                                                    to={child.href}
                                                    className="flex h-7 min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-sm outline-none transition-colors hover:bg-gray-300 hover:text-gray-900 active:bg-gray-300 active:text-gray-900"
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    {child.label}
                                                </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    </div>
                                ))}
                            </div>               
                        </SheetContent>
                    </Sheet>
                </div>
        </nav>
    );
}