'use client'

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, Calculator, Book, Printer, BarChart, Settings, Bot, LogOut, User as UserIcon, LogIn, ClipboardCheck, Shield } from 'lucide-react';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

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
  useSidebar,
  SidebarMenuSkeleton
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button';
import { Skeleton } from './ui/skeleton';

const menuItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/matematica', label: 'Matemática', icon: Calculator },
  { href: '/portugues', label: 'Português', icon: Book },
  { href: '/tarefas', label: 'Tarefas', icon: ClipboardCheck },
  { href: '/imprimir', label: 'Imprimir', icon: Printer },
  { href: '/progresso', label: 'Progresso', icon: BarChart },
];

const settingsMenuItem = { href: '/configuracoes', label: 'Configurações', icon: Settings };

function UserNav() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const teacherDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'teachers', user.uid) : null),
    [firestore, user]
  );
  const { data: teacherProfile, isLoading: isTeacherLoading } = useDoc(teacherDocRef);

  const studentDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'students', user.uid) : null),
    [firestore, user]
  );
  const { data: studentProfile, isLoading: isStudentLoading } = useDoc(studentDocRef);
  
  useEffect(() => {
    if (user && firestore) {
      let userRef;
      let profile;

      if (teacherProfile) {
        userRef = teacherDocRef;
        profile = teacherProfile;
      } else if (studentProfile) {
        userRef = studentDocRef;
        profile = studentProfile;
      }

      if (userRef && profile) {
        const now = new Date();
        // Check if lastSeen exists and is a valid date string before creating a Date from it.
        const lastSeen = profile.lastSeen && typeof profile.lastSeen === 'string' 
          ? new Date(profile.lastSeen) 
          : new Date(0);
        
        // Only update if last seen was more than 1 minute ago to prevent write loops.
        const diffInMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
        
        if (diffInMinutes > 1) {
          // Non-blocking update. We don't await it.
          updateDoc(userRef, {
            lastSeen: now.toISOString(),
          }).catch(e => console.error("Failed to update lastSeen timestamp", e));
        }
      }
    }
  }, [pathname, user, firestore, teacherProfile, studentProfile, teacherDocRef, studentDocRef]);


  const isLoading = isUserLoading || isTeacherLoading || isStudentLoading;

  if (isLoading) {
    return (
        <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-24 hidden sm:block" />
            <Skeleton className="h-8 w-8 rounded-full" />
        </div>
    );
  }

  if (user) {
    const profile = teacherProfile || studentProfile;
    const isAdmin = user.uid === 'yUKh2hnexMdiTd2t9rXEU0SgjPk1';
    // For the admin user, if their profile was deleted, we can default their name.
    const displayName = profile?.name || (isAdmin ? 'Administrador' : (user.displayName || 'Usuário'));

    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm font-medium text-right sm:block">{displayName}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL || ''} alt={displayName} />
                <AvatarFallback>
                  <UserIcon />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {displayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/perfil')} className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => {
              await auth.signOut();
              router.push('/login');
            }} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Button asChild>
        <Link href="/login">
            Entrar
            <LogIn className="ml-2 h-4 w-4"/>
        </Link>
    </Button>
  )
}

function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();
  const { setOpen } = useSidebar();
  
  const teacherDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'teachers', user.uid) : null),
    [firestore, user]
  );
  const { data: teacherProfile, isLoading: isTeacherLoading } = useDoc(teacherDocRef);
  
  const ADMIN_UID = 'yUKh2hnexMdiTd2t9rXEU0SgjPk1';
  const isAdmin = user?.uid === ADMIN_UID;
  
  const canShowImprimir = !isTeacherLoading && (!!teacherProfile || isAdmin);

  const handleMenuItemClick = () => {
    setOpen(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 group-data-[state=collapsed]:justify-center">
          <Bot className="w-8 h-8 shrink-0 text-primary" />
          <h1 className="text-2xl font-bold font-headline text-foreground group-data-[state=collapsed]:hidden">ProZil</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            if (item.href === '/imprimir' && !canShowImprimir) {
              if (isTeacherLoading) {
                return <SidebarMenuSkeleton key={item.href} showIcon />;
              }
              return null; // Don't show if not teacher/admin
            }
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                  tooltip={item.label}
                  onClick={handleMenuItemClick}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/admin')}
                tooltip="Admin"
                onClick={handleMenuItemClick}
              >
                <Link href="/admin">
                  <Shield />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === settingsMenuItem.href}
              tooltip={settingsMenuItem.label}
              onClick={handleMenuItemClick}
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
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b bg-card">
          <SidebarTrigger />
          <div></div>
          <UserNav />
        </header>
        <div className="flex-1 p-4 overflow-auto sm:p-6 md:p-8">
            {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
