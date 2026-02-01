'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DirectorDashboardRedirect() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      // Once we know the user's status, redirect to the home page,
      // which now serves as the director's main dashboard.
      router.replace('/');
    }
  }, [isUserLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <Loader2 className="w-16 h-16 animate-spin text-primary" />
      <h1 className="mt-4 text-2xl font-bold">Redirecionando...</h1>
      <p className="text-muted-foreground">Carregando seu painel principal.</p>
    </div>
  );
}
