'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import TeacherTaskView from './teacher-task-view';
import StudentTaskView from './student-task-view';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldAlert, LogIn, ClipboardCheck } from 'lucide-react';

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
        <Card className="w-full max-w-lg mx-auto text-center">
          <CardHeader>
            <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
              <ClipboardCheck className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold font-headline">Suas Tarefas Esperam por Você</CardTitle>
            <CardDescription className="text-lg">
              Este é o seu centro de atividades. Aqui você encontrará todas as tarefas enviadas por seus professores, organizadas e prontas para começar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Faça login para ver suas atividades pendentes e seu histórico de tarefas concluídas.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild size="lg">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Fazer Login para Ver Tarefas
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
