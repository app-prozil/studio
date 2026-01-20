'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import TeacherTaskView from './teacher-task-view';
import StudentTaskView from './student-task-view';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldAlert, LogIn } from 'lucide-react';

export default function TarefasPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

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


  if (isUserLoading || isTeacherLoading || isStudentLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-md mx-auto text-center">
              <CardHeader>
                  <div className="mx-auto bg-destructive/10 rounded-full p-4 w-fit mb-2">
                      <ShieldAlert className="w-12 h-12 text-destructive" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Acesso Restrito</CardTitle>
                  <CardDescription>Esta página é protegida.</CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">
                      Para visualizar suas tarefas, você precisa estar logado na sua conta.
                  </p>
              </CardContent>
              <CardFooter className="flex justify-center">
                  <Button asChild size="lg">
                      <Link href="/login">
                          <LogIn className="mr-2 h-4 w-4" />
                          Fazer Login
                      </Link>
                  </Button>
              </CardFooter>
          </Card>
      </div>
    );
  }

  if (teacherProfile) {
    return <TeacherTaskView teacherId={user.uid} />;
  }

  if (studentProfile) {
    return <StudentTaskView studentId={user.uid} />;
  }

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">Perfil não encontrado</h1>
      <p className="text-muted-foreground">Não conseguimos identificar seu perfil como professor ou aluno.</p>
    </div>
  );
}
