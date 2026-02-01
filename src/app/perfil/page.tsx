'use client';

import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { useState, useEffect } from 'react';
import { doc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Copy, Loader2, Trash2, ShieldAlert, LogIn } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

type StudentProfileData = {
  id: string;
  name: string;
  email: string;
  prozilId: string;
  teacherIds?: string[];
};

type TeacherProfileData = {
  id: string;
  name: string;
  prozilId: string;
}

function TeacherList({ teacherIds, studentUid }: { teacherIds: string[], studentUid: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [teachers, setTeachers] = useState<TeacherProfileData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!teacherIds || teacherIds.length === 0) {
            setTeachers([]);
            setIsLoading(false);
            return;
        }

        const fetchTeachers = async () => {
            setIsLoading(true);
            try {
                const teachersRef = collection(firestore, 'teachers');
                const q = query(teachersRef, where('__name__', 'in', teacherIds.slice(0, 10))); // 'in' query limit
                const querySnapshot = await getDocs(q);
                const teacherData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherProfileData));
                setTeachers(teacherData);
            } catch (error) {
                console.error("Error fetching teachers:", error);
                toast({ variant: 'destructive', title: 'Erro ao buscar professores' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeachers();
    }, [teacherIds, firestore, toast]);

    const handleUnlink = async (teacherIdToUnlink: string) => {
        const studentRef = doc(firestore, 'students', studentUid);
        try {
            await updateDoc(studentRef, {
                teacherIds: arrayRemove(teacherIdToUnlink)
            });
            toast({ title: 'Professor desvinculado com sucesso!' });
        } catch (error) {
            console.error("Error unlinking teacher:", error);
            toast({ variant: 'destructive', title: 'Erro ao desvincular professor' });
        }
    };

    if (isLoading) {
        return <Skeleton className="h-24 w-full" />;
    }

    if (teachers.length === 0) {
        return <p className="px-3 text-sm text-muted-foreground">Você ainda não está vinculado a nenhum professor.</p>;
    }

    return (
        <ul className="space-y-2">
            {teachers.map(teacher => (
                <li key={teacher.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                        <p className="font-semibold">{teacher.name}</p>
                        <p className="text-xs text-muted-foreground">{teacher.prozilId}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleUnlink(teacher.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Desvincular
                    </Button>
                </li>
            ))}
        </ul>
    );
}

type LinkedStudent = {
  id: string;
  name: string;
  prozilId: string;
};

function TeacherStudentList({ teacherId }: { teacherId: string }) {
    const firestore = useFirestore();
    
    const studentsQuery = useMemoFirebase(
        () => (firestore && teacherId) 
            ? query(collection(firestore, 'students'), where('teacherIds', 'array-contains', teacherId))
            : null,
        [firestore, teacherId]
    );

    const { data: students, isLoading, error } = useCollection<LinkedStudent>(studentsQuery);

    if (isLoading) {
        return <Skeleton className="h-24 w-full" />;
    }

    if (error) {
        console.error(error);
        return <p className="text-destructive text-center">Ocorreu um erro ao carregar seus alunos.</p>;
    }

    if (!students || students.length === 0) {
        return <p className="text-center text-sm text-muted-foreground py-4">Nenhum aluno se vinculou a você ainda. Compartilhe seu ID ProZil para que eles possam se conectar.</p>;
    }

    return (
        <ul className="space-y-2">
            {students.map(student => (
                <li key={student.id} className="flex items-center justify-between p-3 border rounded-md bg-background/50">
                    <div>
                        <p className="font-semibold">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.prozilId}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
}


export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [prozilIdInput, setProzilIdInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  
  const isAdmin = user?.uid === 'yUKh2hnexMdiTd2t9rXEU0SgjPk1';

  // Sequentially check for user profile
  const teacherDocRef = useMemoFirebase(() => (user ? doc(firestore, 'teachers', user.uid) : null), [firestore, user]);
  const { data: teacherProfile, isLoading: isTeacherLoading } = useDoc(teacherDocRef);

  const shouldCheckStudent = !isAdmin && !isTeacherLoading && !teacherProfile;
  const studentDocRef = useMemoFirebase(() => (shouldCheckStudent && user ? doc(firestore, 'students', user.uid) : null), [shouldCheckStudent, user]);
  const { data: studentProfile, isLoading: isStudentLoading } = useDoc<StudentProfileData>(studentDocRef);

  const shouldCheckDirector = !isAdmin && !isTeacherLoading && !teacherProfile && !isStudentLoading && !studentProfile;
  const directorDocRef = useMemoFirebase(() => (shouldCheckDirector && user ? doc(firestore, 'directors', user.uid) : null), [shouldCheckDirector, user]);
  const { data: directorProfile, isLoading: isDirectorLoading } = useDoc(directorDocRef);

  const isLoading = isUserLoading || isTeacherLoading || (shouldCheckStudent && isStudentLoading) || (shouldCheckDirector && isDirectorLoading);
  const profile = teacherProfile || studentProfile || directorProfile;
  
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
  
  const handleLinkTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prozilIdInput.trim() || !user || !studentProfile) return;
    setIsLinking(true);

    try {
        const teachersRef = collection(firestore, 'teachers');
        const q = query(teachersRef, where("prozilId", "==", prozilIdInput.trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ variant: 'destructive', title: 'Professor não encontrado', description: 'Verifique o ID ProZil e tente novamente.' });
            setIsLinking(false);
            return;
        }

        const teacherDoc = querySnapshot.docs[0];
        const teacherId = teacherDoc.id;

        if (studentProfile.teacherIds && studentProfile.teacherIds.includes(teacherId)) {
            toast({ title: 'Professor já vinculado', description: 'Você já está conectado a este professor.' });
            setIsLinking(false);
            return;
        }

        const studentRef = doc(firestore, 'students', user.uid);
        await updateDoc(studentRef, {
            teacherIds: arrayUnion(teacherId)
        });
        
        toast({ title: 'Professor vinculado com sucesso!' });
        setProzilIdInput('');

    } catch (error) {
        console.error("Error linking teacher:", error);
        toast({ variant: 'destructive', title: 'Erro ao vincular professor' });
    } finally {
        setIsLinking(false);
    }
  };


  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold font-headline mb-2">Meu Perfil</h1>
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
                      Para visualizar seu perfil, você precisa estar logado na sua conta.
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

  const displayName = profile?.name || user.displayName || 'Usuário';
  const userRole = isAdmin ? 'Administrador' : teacherProfile ? 'Professor' : studentProfile ? 'Aluno' : directorProfile ? 'Diretoria' : 'Não definido';
  
  let descriptionText = '';
  if (teacherProfile) {
    descriptionText = 'Compartilhe este ID ProZil com seus alunos para que eles possam se conectar à sua turma.';
  } else if (studentProfile) {
    descriptionText = 'Este é o seu ID ProZil de aluno.';
  } else if (directorProfile) {
    descriptionText = 'Este é o seu ID ProZil de diretoria.';
  }


  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-4xl font-bold font-headline mb-2">Meu Perfil</h1>
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
        <CardContent>
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
        </CardContent>
      </Card>
      
      {studentProfile && (
        <Card>
            <CardHeader>
                <CardTitle>Meus Professores</CardTitle>
                <CardDescription>Vincule novos professores usando o ID ProZil deles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleLinkTeacher} className="space-y-2">
                    <Label htmlFor="teacher-prozil-id">ID ProZil do Professor</Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            id="teacher-prozil-id" 
                            placeholder="cole-o-id-aqui" 
                            value={prozilIdInput}
                            onChange={(e) => setProzilIdInput(e.target.value)}
                        />
                        <Button type="submit" disabled={isLinking || !prozilIdInput.trim()}>
                            {isLinking ? <Loader2 className="animate-spin" /> : 'Vincular'}
                        </Button>
                    </div>
                </form>
                <Separator />
                 <div>
                    <Label>Professores Vinculados</Label>
                    <div className="mt-2">
                        <TeacherList teacherIds={studentProfile.teacherIds || []} studentUid={user.uid} />
                    </div>
                </div>
            </CardContent>
        </Card>
      )}

      {teacherProfile && user && (
        <Card>
            <CardHeader>
                <CardTitle>Meus Alunos</CardTitle>
                <CardDescription>Estes são os alunos que estão vinculados a você.</CardDescription>
            </CardHeader>
            <CardContent>
                <TeacherStudentList teacherId={user.uid} />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
