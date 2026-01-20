'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, writeBatch, deleteField, getDocs } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, ShieldAlert, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';


const userSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  prozilId: z.string().min(1, 'O ProZil ID é obrigatório.'),
  email: z.string().email('Email inválido.'),
});

type UserProfile = {
  id: string;
  name: string;
  email: string;
  prozilId: string;
  lastSeen?: string;
  deletedAt?: string;
};

function UserTable({ type, showArchived }: { type: 'teacher' | 'student', showArchived: boolean}) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const collectionName = type === 'teacher' ? 'teachers' : 'students';
  
  const usersQuery = useMemoFirebase(
    () => (firestore && user?.uid === 'yUKh2hnexMdiTd2t9rXEU0SgjPk1') ? collection(firestore, collectionName) : null,
    [firestore, collectionName, user]
  );
  
  const { data: allUsers, isLoading, error } = useCollection<UserProfile>(usersQuery);

  const users = useMemo(() => {
    if (!allUsers) return null;
    const isArchived = (user: UserProfile) => user.deletedAt != null;
    return allUsers.filter(user => showArchived ? isArchived(user) : !isArchived(user));
  }, [allUsers, showArchived]);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [archivingUser, setArchivingUser] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
  });

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    form.reset({ name: user.name, prozilId: user.prozilId, email: user.email });
  };

  const handleUpdate = (values: z.infer<typeof userSchema>) => {
    if (!editingUser) return;
    setIsSubmitting(true);
    const userRef = doc(firestore, collectionName, editingUser.id);
    updateDoc(userRef, values)
      .then(() => {
        toast({ title: 'Usuário atualizado com sucesso!' });
        setEditingUser(null);
      })
      .catch((e) => {
        console.error(e);
        toast({ variant: 'destructive', title: 'Erro ao atualizar', description: 'Você pode não ter permissão para isso.' });
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleArchive = () => {
    if (!archivingUser) return;
    
    if (archivingUser.id === 'yUKh2hnexMdiTd2t9rXEU0SgjPk1') {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'O administrador não pode arquivar a si mesmo.',
      });
      setArchivingUser(null);
      return;
    }

    setIsSubmitting(true);
    const userRef = doc(firestore, collectionName, archivingUser.id);
    updateDoc(userRef, { deletedAt: new Date().toISOString() })
      .then(() => {
        toast({ title: 'Usuário arquivado com sucesso!' });
        setArchivingUser(null);
      })
      .catch((e) => {
        console.error(e);
        toast({ variant: 'destructive', title: 'Erro ao arquivar', description: 'Não foi possível arquivar o usuário.' });
      })
      .finally(() => setIsSubmitting(false));
  };
  
  const handleRestore = (userToRestore: UserProfile) => {
    const userRef = doc(firestore, collectionName, userToRestore.id);
    updateDoc(userRef, { deletedAt: deleteField() })
      .then(() => {
        toast({ title: 'Usuário restaurado com sucesso!' });
      })
      .catch((e) => {
        console.error(e);
        toast({ variant: 'destructive', title: 'Erro ao restaurar', description: 'Não foi possível restaurar o usuário.' });
      });
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-destructive">Ocorreu um erro ao carregar os usuários. Verifique as permissões do Firestore.</p>;
  if (!users) return <p>Nenhum usuário encontrado.</p>

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>ProZil ID</TableHead>
              <TableHead>Visto por Último</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><code>{user.prozilId}</code></TableCell>
                <TableCell>
                  {user.lastSeen ? formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true, locale: ptBR }) : 'Nunca'}
                </TableCell>
                <TableCell className="text-right">
                   {showArchived ? (
                    <Button variant="outline" size="sm" onClick={() => handleRestore(user)}>
                        <ArchiveRestore className="mr-2 h-4 w-4"/> Restaurar
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setArchivingUser(user)} className="text-destructive hover:text-destructive"><Archive className="w-4 h-4" /></Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {type === 'teacher' ? 'Professor' : 'Aluno'}</DialogTitle>
            <DialogDescription>Altere os dados do usuário abaixo.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="prozilId" render={({ field }) => (<FormItem><FormLabel>ProZil ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin mr-2" />} Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archivingUser} onOpenChange={(open) => !open && setArchivingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Usuário?</AlertDialogTitle>
            <AlertDialogDescription>
             Esta ação irá arquivar o perfil do usuário, impedindo o acesso. A conta de autenticação (login) não será removida. O perfil poderá ser restaurado a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null} Sim, Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const ADMIN_UID = 'yUKh2hnexMdiTd2t9rXEU0SgjPk1';
  const isAuthorized = user?.uid === ADMIN_UID;
  
  const [isClearing, setIsClearing] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const [showArchivedTeachers, setShowArchivedTeachers] = useState(false);
  const [showArchivedStudents, setShowArchivedStudents] = useState(false);

  const handleClearData = async () => {
    if (!isAuthorized) {
        toast({ variant: 'destructive', title: 'Não autorizado.' });
        return;
    }
    setIsClearing(true);
    setIsClearConfirmOpen(false);

    try {
        const batch = writeBatch(firestore);

        const studentsCollectionRef = collection(firestore, 'students');
        const studentsSnapshot = await getDocs(studentsCollectionRef);
        studentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const teachersCollectionRef = collection(firestore, 'teachers');
        const teachersSnapshot = await getDocs(teachersCollectionRef);
        teachersSnapshot.forEach(doc => {
            if (doc.id !== ADMIN_UID) {
                batch.delete(doc.ref);
            }
        });

        await batch.commit();
        toast({ title: 'Sucesso!', description: 'Todos os perfis de professores e alunos (exceto o admin) foram removidos.' });
    } catch (e) {
        console.error("Error clearing data: ", e);
        toast({ variant: 'destructive', title: 'Erro ao limpar dados', description: 'Verifique as permissões ou tente novamente.' });
    } finally {
        setIsClearing(false);
    }
  };


  if (isUserLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!user) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Você precisa estar logado para acessar esta página.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline">Painel do Administrador</h1>
        <p className="text-muted-foreground">Gerencie professores, alunos e o conteúdo da plataforma.</p>
      </div>

      {!isAuthorized && (
         <Card className="border-destructive">
          <CardHeader className="flex-row items-center gap-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
            <div>
              <CardTitle>Acesso Restrito</CardTitle>
              <CardDescription>Apenas administradores podem gerenciar usuários.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      {isAuthorized && (
        <>
          <Card>
              <CardHeader>
                  <CardTitle>Ações do Administrador</CardTitle>
                  <CardDescription>Use estas ações para gerenciar os dados da plataforma.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div>
                      <Button variant="destructive" onClick={() => setIsClearConfirmOpen(true)} disabled={isClearing}>
                          {isClearing ? <Loader2 className="animate-spin mr-2"/> : <Trash2 className="mr-2"/>}
                          Limpar Perfis de Usuários
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                          Remove todos os perfis de professores e alunos do banco de dados.
                      </p>
                  </div>
                </div>
              </CardContent>
          </Card>
        
          <Tabs defaultValue="teachers">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="teachers">Professores</TabsTrigger>
                <TabsTrigger value="students">Alunos</TabsTrigger>
            </TabsList>
            <TabsContent value="teachers" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Professores</CardTitle>
                  <div className="flex items-center justify-between pt-1">
                    <CardDescription>Visualize, edite ou arquive perfis de professores.</CardDescription>
                     <div className="flex items-center space-x-2">
                        <Switch id="show-archived-teachers" checked={showArchivedTeachers} onCheckedChange={setShowArchivedTeachers} />
                        <Label htmlFor="show-archived-teachers">Mostrar Arquivados</Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <UserTable type="teacher" showArchived={showArchivedTeachers} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="students" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Alunos</CardTitle>
                   <div className="flex items-center justify-between pt-1">
                    <CardDescription>Visualize, edite ou arquive perfis de alunos.</CardDescription>
                    <div className="flex items-center space-x-2">
                        <Switch id="show-archived-students" checked={showArchivedStudents} onCheckedChange={setShowArchivedStudents} />
                        <Label htmlFor="show-archived-students">Mostrar Arquivados</Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <UserTable type="student" showArchived={showArchivedStudents}/>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente todos os perfis de professores e alunos do <strong>banco de dados (Firestore)</strong>.
              <br/><br/>
              <strong className="text-destructive">Importante:</strong> Esta ação <strong>NÃO</strong> exclui as contas de login (email e senha) do <strong>Firebase Authentication</strong>. Para liberar um e-mail para novo cadastro, você deve excluir a conta manualmente no Firebase Console.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData} disabled={isClearing} className="bg-destructive hover:bg-destructive/90">
              {isClearing ? <Loader2 className="animate-spin mr-2" /> : null} Sim, Limpar Perfis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    