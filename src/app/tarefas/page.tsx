'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import TeacherTaskView from './teacher-task-view';
import StudentTaskView from './student-task-view';

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
      <div className="text-center">
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Você precisa estar logado para ver as tarefas.</p>
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
