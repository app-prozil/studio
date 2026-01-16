'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Edit, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const ADMIN_EMAIL = 'admin@prozil.com';

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
};

const NotAuthorizedMessage = () => (
    <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
      <p className="text-sm text-muted-foreground">Você não tem permissão para visualizar esta lista.</p>
    </div>
);

function UserTable({ type, canQuery }: { type: 'teacher' | 'student', canQuery: boolean }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const collectionName = type === 'teacher' ? 'teachers' : 'students';
  
  const query = useMemoFirebase(
    () => (canQuery ? collection(firestore, collectionName) : null),
    [firestore, collectionName, canQuery]
  );
  
  const { data: users, isLoading, error } = useCollection<UserProfile>(query);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
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

  const handleDelete = () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    const userRef = doc(firestore, collectionName, deletingUser.id);
    deleteDoc(userRef)
      .then(() => {
        toast({ title: 'Usuário excluído com sucesso!' });
        setDeletingUser(null);
      })
      .catch((e) => {
        console.error(e);
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: 'Não foi possível excluir o documento do usuário. As tarefas associadas podem permanecer.' });
      })
      .finally(() => setIsSubmitting(false));
  };
  
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-destructive">Erro ao carregar usuários: {error.message}</p>;
  if (!canQuery) return <NotAuthorizedMessage />;


  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>ProZil ID</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><code>{user.prozilId}</code></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingUser(user)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
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

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o perfil do usuário do Firestore, mas a conta de autenticação permanecerá.
              As tarefas e exercícios associados não serão excluídos. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null} Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const isAuthorized = user?.email === ADMIN_EMAIL;

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
        <p className="text-muted-foreground">Gerencie professores e alunos da plataforma.</p>
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
      
      <Tabs defaultValue="teachers">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="teachers">Professores</TabsTrigger>
            <TabsTrigger value="students">Alunos</TabsTrigger>
        </TabsList>
        <TabsContent value="teachers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Professores</CardTitle>
              <CardDescription>Visualize, edite ou remova perfis de professores.</CardDescription>
            </CardHeader>
            <CardContent>
               <UserTable type="teacher" canQuery={isAuthorized} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="students" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Alunos</CardTitle>
              <CardDescription>Visualize, edite ou remova perfis de alunos.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable type="student" canQuery={isAuthorized} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
