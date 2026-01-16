'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const taskSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  studentId: z.string().min(1, 'O ID do aluno é obrigatório.'),
  subject: z.enum(['matematica', 'portugues'], { required_error: 'Selecione uma matéria.' }),
  taskType: z.enum(['jogo_interativo', 'folha_imprimivel'], { required_error: 'Selecione o tipo.' }),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data inválida.' }),
  difficulty: z.enum(['easy', 'medium', 'hard'], { required_error: 'Selecione a dificuldade.'}),
  numberOfQuestions: z.coerce.number().min(1, 'O mínimo é 1 questão.').max(20, 'O máximo são 20 questões.'),
});

const editTaskSchema = taskSchema.omit({ studentId: true });


function TaskList({ teacherId }: { teacherId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const tasksQuery = useMemoFirebase(
      () => collection(firestore, 'teachers', teacherId, 'tasks'),
      [firestore, teacherId]
    );
    const { data: tasks, isLoading } = useCollection(tasksQuery);

    const [editTask, setEditTask] = useState<any | null>(null);
    const [deleteTask, setDeleteTask] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const editForm = useForm<z.infer<typeof editTaskSchema>>({
      resolver: zodResolver(editTaskSchema),
    });

    // Populate form when a task is selected for editing
    useState(() => {
        if (editTask) {
            editForm.reset({
                ...editTask,
                dueDate: format(new Date(editTask.dueDate), 'yyyy-MM-dd'),
            });
        }
    }, [editTask, editForm]);


    const handleUpdateTask = async (values: z.infer<typeof editTaskSchema>) => {
      if (!editTask) return;
      setIsSubmitting(true);
  
      const updatedData = {
        ...editTask,
        ...values,
        dueDate: new Date(values.dueDate).toISOString(),
      };
  
      const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', editTask.id);
      const studentTaskRef = doc(firestore, 'students', editTask.studentId, 'tasks', editTask.id);
  
      const teacherUpdate = updateDoc(teacherTaskRef, updatedData);
      const studentUpdate = updateDoc(studentTaskRef, updatedData);
  
      try {
        await Promise.all([teacherUpdate, studentUpdate]);
        toast({
          title: 'Tarefa atualizada!',
          description: 'A tarefa foi atualizada com sucesso para o professor e para o aluno.',
        });
        setEditTask(null);
      } catch (error) {
        console.error('Failed to update task:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar',
          description: 'Não foi possível atualizar a tarefa. Tente novamente.',
        });
        // Optionally emit a more specific permission error
        const permissionError = new FirestorePermissionError({
            path: teacherTaskRef.path, // or studentTaskRef.path
            operation: 'update',
            requestResourceData: updatedData,
          });
        errorEmitter.emit('permission-error', permissionError);
      } finally {
        setIsSubmitting(false);
      }
    };
  
    const handleDeleteTask = async () => {
      if (!deleteTask) return;
      setIsSubmitting(true);
  
      const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', deleteTask.id);
      const studentTaskRef = doc(firestore, 'students', deleteTask.studentId, 'tasks', deleteTask.id);
  
      const teacherDelete = deleteDoc(teacherTaskRef);
      const studentDelete = deleteDoc(studentTaskRef);
  
      try {
        await Promise.all([teacherDelete, studentDelete]);
        toast({
          title: 'Tarefa excluída!',
          description: 'A tarefa foi removida com sucesso.',
        });
        setDeleteTask(null);
      } catch (error) {
        console.error('Failed to delete task:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir a tarefa. Tente novamente.',
        });
         const permissionError = new FirestorePermissionError({
            path: teacherTaskRef.path,
            operation: 'delete',
          });
        errorEmitter.emit('permission-error', permissionError);
      } finally {
        setIsSubmitting(false);
      }
    };

    if (isLoading) {
        return <p>Carregando tarefas...</p>;
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Tarefas Criadas</CardTitle>
                    <CardDescription>A lista de tarefas que você criou. Clique no menu para mais ações.</CardDescription>
                </CardHeader>
                <CardContent>
                    {tasks && tasks.length > 0 ? (
                        <ul className="space-y-4">
                            {tasks.map(task => (
                                <li key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex-1">
                                        <h3 className="font-bold">{task.title}</h3>
                                        <p className="text-sm text-muted-foreground">Aluno ID: {task.studentId}</p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span>Matéria: <span className="font-semibold">{task.subject}</span></span>
                                        <span>Dificuldade: <span className="font-semibold">{task.difficulty}</span></span>
                                        <span>Questões: <span className="font-semibold">{task.numberOfQuestions}</span></span>
                                        </div>
                                        <p className="text-sm">Vencimento: {format(new Date(task.dueDate), 'dd/MM/yyyy')}</p>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                             <DropdownMenuItem asChild className="cursor-pointer">
                                                <Link href={`/${task.subject}?taskId=${task.id}&studentId=${task.studentId}&topic=${encodeURIComponent(task.title)}&difficulty=${task.difficulty}&questions=${task.numberOfQuestions}`} target="_blank">
                                                    <Eye className="mr-2 h-4 w-4"/> Visualizar
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setEditTask(task)} className="cursor-pointer">
                                                <Edit className="mr-2 h-4 w-4"/> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => setDeleteTask(task)} className="text-destructive cursor-pointer">
                                                <Trash2 className="mr-2 h-4 w-4"/> Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted-foreground">Nenhuma tarefa criada ainda.</p>
                    )}
                </CardContent>
            </Card>

            {/* Edit Task Dialog */}
            <Dialog open={!!editTask} onOpenChange={(isOpen) => !isOpen && setEditTask(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(handleUpdateTask)} className="space-y-6">
                        <DialogHeader>
                            <DialogTitle>Editar Tarefa</DialogTitle>
                            <DialogDescription>Faça as alterações na tarefa e clique em salvar.</DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                            <FormField
                                control={editForm.control}
                                name="title"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título da Tarefa (Tópico)</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormItem>
                                <FormLabel>ID do Aluno (não pode ser alterado)</FormLabel>
                                <FormControl><Input readOnly disabled value={editTask?.studentId || ''} /></FormControl>
                            </FormItem>
                            <FormField
                                control={editForm.control}
                                name="description"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl><Textarea {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <FormField control={editForm.control} name="subject" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Matéria</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="matematica">Matemática</SelectItem><SelectItem value="portugues">Português</SelectItem></SelectContent></Select><FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={editForm.control} name="taskType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Tarefa</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="jogo_interativo">Jogo Interativo</SelectItem><SelectItem value="folha_imprimivel">Folha Imprimível</SelectItem></SelectContent></Select><FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <FormField control={editForm.control} name="difficulty" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dificuldade</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="easy">Fácil</SelectItem><SelectItem value="medium">Médio</SelectItem><SelectItem value="hard">Difícil</SelectItem></SelectContent></Select><FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={editForm.control} name="numberOfQuestions" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nº de Questões</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl><FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={editForm.control} name="dueDate" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data de Entrega</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl><FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancelar</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </DialogFooter>
                    </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Task Confirmation */}
            <AlertDialog open={!!deleteTask} onOpenChange={(isOpen) => !isOpen && setDeleteTask(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a tarefa
                             <span className="font-bold">"{deleteTask?.title}"</span> para você e para o aluno.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTask} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                           {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Sim, excluir tarefa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


export default function TeacherTaskView({ teacherId }: { teacherId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      studentId: '',
      description: '',
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
      difficulty: 'easy',
      numberOfQuestions: 5,
      subject: 'matematica',
      taskType: 'jogo_interativo',
    },
  });

  async function onSubmit(values: z.infer<typeof taskSchema>) {
    setIsSubmitting(true);

    const newTaskId = doc(collection(firestore, 'teachers')).id;

    const taskData = {
      id: newTaskId,
      teacherId: teacherId,
      isCompleted: false,
      ...values,
      dueDate: new Date(values.dueDate).toISOString(),
    };

    const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', newTaskId);
    const studentTaskRef = doc(firestore, 'students', values.studentId, 'tasks', newTaskId);

    const handleCreateError = (refPath: string) => {
        const permissionError = new FirestorePermissionError({
            path: refPath,
            operation: 'create',
            requestResourceData: taskData,
        });
        errorEmitter.emit('permission-error', permissionError);
    };

    const teacherWrite = setDoc(teacherTaskRef, taskData);
    const studentWrite = setDoc(studentTaskRef, taskData);

    try {
        await Promise.all([teacherWrite, studentWrite]);
        toast({
            title: 'Tarefa criada!',
            description: `A tarefa "${values.title}" foi atribuída com sucesso.`,
        });
        form.reset({
            ...form.getValues(), // keep some values
            title: '',
            studentId: '',
            description: '',
        });
    } catch(e: any) {
         toast({
            variant: 'destructive',
            title: 'Erro ao criar tarefa',
            description: 'Ocorreu um problema ao salvar a tarefa. Verifique o ID do aluno e suas permissões.',
        });
        if (e.config?.name === 'FirebaseError') {
             handleCreateError(e.customData.path);
        } else {
            console.error(e);
        }
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline">Área do Professor</h1>
        <p className="text-muted-foreground">Crie e gerencie as tarefas dos seus alunos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Tarefa</CardTitle>
          <CardDescription>Preencha os detalhes abaixo para criar uma nova atividade.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Tarefa (Tópico)</FormLabel>
                    <FormControl><Input placeholder="Ex: Adição com 2 dígitos" {...field} /></FormControl>
                    <FormDescription>Este será o tópico usado para gerar as questões de IA.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Aluno</FormLabel>
                    <FormControl><Input placeholder="Cole o ID único do aluno" {...field} /></FormControl>
                    <FormDescription>Você pode obter o ID do aluno na página de perfil dele.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                 <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matéria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione a matéria" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="matematica">Matemática</SelectItem>
                          <SelectItem value="portugues">Português</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taskType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Tarefa</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="jogo_interativo">Jogo Interativo</SelectItem>
                          <SelectItem value="folha_imprimivel">Folha Imprimível</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl><Textarea placeholder="Descreva a atividade para o aluno..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dificuldade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione a dificuldade" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="easy">Fácil</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="hard">Difícil</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numberOfQuestions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº de Questões</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Entrega</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Atribuir Tarefa
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <TaskList teacherId={teacherId} />
    </div>
  );
}
