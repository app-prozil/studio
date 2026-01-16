'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
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

  const isLoading = isUserLoading || isTeacherLoading || isStudentLoading;
  const profile = teacherProfile || studentProfile;
  
  const idToDisplay = profile?.prozilId;

  const handleCopyId = () => {
    if (idToDisplay) {
      navigator.clipboard.writeText(idToDisplay);
      toast({
        title: 'ID Copiado!',
        description: 'Seu ID ProZil foi copiado para a área de transferência.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-bold font-headline mb-8">Meu Perfil</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Você precisa estar logado para ver seu perfil.</p>
      </div>
    );
  }

  const displayName = profile?.name || user.displayName || 'Usuário';
  const userRole = teacherProfile ? 'Professor' : studentProfile ? 'Aluno' : 'Não definido';
  const descriptionText = teacherProfile
    ? 'Compartilhe este ID ProZil com seus alunos para que eles possam se conectar em sua turma.'
    : 'Este é o seu ID ProZil de aluno. Você não precisará dele com frequência.';

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-4xl font-bold font-headline mb-8">Meu Perfil</h1>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{displayName}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
            <div className="text-sm font-medium bg-primary/10 text-primary py-1 px-3 rounded-full">{userRole}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label>Seu ID ProZil</Label>
                <div className="flex items-center justify-between p-3 mt-1 bg-muted rounded-md">
                    <code className="text-sm font-mono break-all">{idToDisplay || user.uid}</code>
                    <Button variant="ghost" size="icon" onClick={handleCopyId} className="shrink-0" disabled={!idToDisplay}>
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copiar ID</span>
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    {descriptionText}
                </p>
            </div>
            {studentProfile && studentProfile.teacherId && (
                 <div>
                    <Label>ID do seu Professor (UID)</Label>
                    <div className="flex items-center justify-between p-3 mt-1 bg-muted rounded-md">
                        <code className="text-sm font-mono break-all">{studentProfile.teacherId}</code>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
