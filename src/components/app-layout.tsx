'use client'

import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Home, Calculator, Book, Printer, BarChart, Settings, Bot } from 'lucide-react';

const menuItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/matematica', label: 'Matemática', icon: Calculator },
  { href: '/portugues', label: 'Português', icon: Book },
  { href: '/imprimir', label: 'Imprimir', icon: Printer },
  { href: '/progresso', label: 'Progresso', icon: BarChart },
];

const settingsMenuItem = { href: '/configuracoes', label: 'Configurações', icon: Settings };

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Bot className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline text-foreground">ProZil</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === settingsMenuItem.href}
                tooltip={settingsMenuItem.label}
              >
                <Link href={settingsMenuItem.href}>
                  <settingsMenuItem.icon />
                  <span>{settingsMenuItem.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center p-4 border-b md:justify-end bg-card">
          <SidebarTrigger className="md:hidden" />
        </header>
        <div className="flex-1 p-4 overflow-auto sm:p-6 md:p-8">
            {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
