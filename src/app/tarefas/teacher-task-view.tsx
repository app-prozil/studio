'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Send, Edit, BookCopy, Search, X, Save } from 'lucide-react';
import { format } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';


// Schemas
const exerciseSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(5, 'A pergunta deve ter pelo menos 5 caracteres.'),
  options: z.array(z.string().min(1, "A opção não pode estar vazia.")).length(3, 'Deve haver exatamente 3 opções.'),
  answer: z.string().min(1, 'A resposta correta é obrigatória.'),
  subject: z.enum(['matematica', 'portugues']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  studentId: z.string().min(1, 'O ID do aluno é obrigatório.'),
  subject: z.enum(['matematica', 'portugues']),
  taskType: z.enum(['jogo_interativo', 'folha_imprimivel']),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data inválida.' }),
  questions: z.array(exerciseSchema.pick({ text: true, options: true, answer: true })).min(1, 'A tarefa deve ter pelo menos uma questão.'),
});


type Exercise = z.infer<typeof exerciseSchema>;
type Task = z.infer<typeof taskSchema>;


function ExerciseBank({ teacherId }: { teacherId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);

  const exercisesQuery = useMemoFirebase(() => collection(firestore, 'teachers', teacherId, 'exercises'), [firestore, teacherId]);
  const { data: exercises, isLoading } = useCollection<Exercise>(exercisesQuery);
  
  const form = useForm<Exercise>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: { text: '', options: ['', '', ''], answer: '', subject: 'matematica', difficulty: 'easy' },
  });

  useEffect(() => {
    if (editingExercise) {
      form.reset(editingExercise);
    } else {
      form.reset({ text: '', options: ['', '', ''], answer: '', subject: 'matematica', difficulty: 'easy' });
    }
  }, [editingExercise, form]);

  const onSubmit = async (values: Exercise) => {
    setIsSubmitting(true);
    try {
      if (editingExercise?.id) {
        const exerciseRef = doc(firestore, 'teachers', teacherId, 'exercises', editingExercise.id);
        await updateDoc(exerciseRef, values);
        toast({ title: 'Exercício atualizado!' });
      } else {
        const newExercise = { ...values, teacherId };
        await addDoc(collection(firestore, 'teachers', teacherId, 'exercises'), newExercise);
        toast({ title: 'Exercício salvo no banco!' });
      }
      setEditingExercise(null);
      form.reset();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao salvar exercício' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingExercise?.id) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(firestore, 'teachers', teacherId, 'exercises', deletingExercise.id));
      toast({ title: 'Exercício excluído!' });
      setDeletingExercise(null);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro ao excluir' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
     <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>{editingExercise ? 'Editar Exercício' : 'Criar Novo Exercício'}</CardTitle>
          <CardDescription>Adicione uma nova pergunta ao seu banco de exercícios reutilizáveis.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="text" render={({ field }) => (
                <FormItem><FormLabel>Pergunta</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel>Matéria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="matematica">Matemática</SelectItem><SelectItem value="portugues">Português</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem><FormLabel>Dificuldade</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="easy">Fácil</SelectItem><SelectItem value="medium">Médio</SelectItem><SelectItem value="hard">Difícil</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="options.0" render={({ field }) => (
                <FormItem><FormLabel>Opção 1</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="options.1" render={({ field }) => (
                <FormItem><FormLabel>Opção 2</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="options.2" render={({ field }) => (
                <FormItem><FormLabel>Opção 3</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="answer" render={({ field }) => (
                <FormItem><FormLabel>Resposta Correta</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>O texto da resposta deve corresponder exatamente a uma das opções.</FormDescription><FormMessage /></FormItem>
              )}/>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                  {editingExercise ? 'Salvar Alterações' : 'Salvar Exercício'}
                </Button>
                {editingExercise && <Button variant="ghost" onClick={() => setEditingExercise(null)}>Cancelar Edição</Button>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Seu Banco de Exercícios</CardTitle>
           <CardDescription>Visualize e gerencie os exercícios que você criou.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Carregando exercícios...</p>}
          <ul className="space-y-2 h-[500px] overflow-y-auto">
            {exercises?.map(ex => (
              <li key={ex.id} className="p-3 border rounded-lg flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold">{ex.text}</p>
                  <p className="text-sm text-muted-foreground">Resposta: {ex.answer}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">{ex.subject === 'matematica' ? 'Matemática' : 'Português'}</Badge>
                    <Badge variant="outline">{ex.difficulty}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                   <Button variant="ghost" size="icon" onClick={() => setEditingExercise(ex)}><Edit className="w-4 h-4" /></Button>
                   <Button variant="ghost" size="icon" onClick={() => setDeletingExercise(ex)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <AlertDialog open={!!deletingExercise} onOpenChange={open => !open && setDeletingExercise(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Exercício?</AlertDialogTitle><AlertDialogDescription>Esta ação é permanente e removerá o exercício do seu banco.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TaskManager({ teacherId }: { teacherId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  const exercisesQuery = useMemoFirebase(() => collection(firestore, 'teachers', teacherId, 'exercises'), [firestore, teacherId]);
  const { data: exercises } = useCollection<Exercise>(exercisesQuery);
  
  const form = useForm<Task>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', studentId: '', description: '', dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], subject: 'matematica', taskType: 'jogo_interativo', questions: [] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" });

  useEffect(() => {
    form.setValue('questions', selectedExercises.map(e => ({text: e.text, options: e.options, answer: e.answer})));
  }, [selectedExercises, form]);

  const onSubmit = async (values: Task) => {
    setIsSubmitting(true);
    
    const newTaskId = doc(collection(firestore, 'teachers')).id;
    const taskData = { ...values, id: newTaskId, teacherId, isCompleted: false, dueDate: new Date(values.dueDate).toISOString() };

    const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', newTaskId);
    const studentTaskRef = doc(firestore, 'students', values.studentId, 'tasks', newTaskId);

    try {
        await setDoc(teacherTaskRef, taskData);
        await setDoc(studentTaskRef, taskData);
        toast({ title: 'Tarefa criada com sucesso!' });
        form.reset();
        setSelectedExercises([]);
    } catch(error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro ao criar tarefa' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
     <>
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Tarefa</CardTitle>
          <CardDescription>Preencha os detalhes e adicione exercícios do seu banco.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título da Tarefa</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="studentId" render={({ field }) => (<FormItem><FormLabel>ID do Aluno</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Matéria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="matematica">Matemática</SelectItem><SelectItem value="portugues">Português</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="taskType" render={({ field }) => (<FormItem><FormLabel>Tipo de Tarefa</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="jogo_interativo">Jogo Interativo</SelectItem><SelectItem value="folha_imprimivel">Folha Imprimível</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem><FormLabel>Data de Entrega</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              </div>

              <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Exercícios da Tarefa ({selectedExercises.length})</CardTitle>
                        <CardDescription>Adicione perguntas do seu banco de exercícios.</CardDescription>
                    </div>
                    <Button type="button" onClick={() => setIsBankOpen(true)}><PlusCircle className="mr-2"/> Adicionar</Button>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {selectedExercises.map((ex, index) => (
                           <li key={ex.id} className="flex items-center justify-between p-2 border rounded-md">
                               <span className="truncate">{ex.text}</span>
                               <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedExercises(prev => prev.filter(p => p.id !== ex.id))}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                           </li> 
                        ))}
                    </ul>
                    <FormMessage>{form.formState.errors.questions?.message}</FormMessage>
                </CardContent>
              </Card>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />} Atribuir Tarefa
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
              <DialogHeader><DialogTitle>Adicionar Exercícios do Banco</DialogTitle><DialogDescription>Selecione os exercícios que você quer adicionar a esta tarefa.</DialogDescription></DialogHeader>
              <div className="flex-1 overflow-y-auto pr-4">
                  {exercises?.map(ex => (
                    <div key={ex.id} className="flex items-center gap-4 p-2 border-b">
                        <Checkbox 
                            id={ex.id} 
                            checked={selectedExercises.some(s => s.id === ex.id)}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    setSelectedExercises(prev => [...prev, ex]);
                                } else {
                                    setSelectedExercises(prev => prev.filter(p => p.id !== ex.id));
                                }
                            }}
                        />
                        <label htmlFor={ex.id} className="flex-1">
                            <p className="font-semibold">{ex.text}</p>
                            <div className="flex gap-2 mt-1">
                                <Badge variant="secondary">{ex.subject === 'matematica' ? 'Matemática' : 'Português'}</Badge>
                                <Badge variant="outline">{ex.difficulty}</Badge>
                            </div>
                        </label>
                    </div>
                  ))}
              </div>
              <DialogFooter>
                  <Button onClick={() => setIsBankOpen(false)}>Concluir</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
     </> 
  );
}


export default function TeacherTaskView({ teacherId }: { teacherId: string }) {
  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-4xl font-bold font-headline">Área do Professor</h1>
        <p className="text-muted-foreground">Crie e gerencie os exercícios e tarefas dos seus alunos.</p>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks">Gerenciar Tarefas</TabsTrigger>
          <TabsTrigger value="exercises">Banco de Exercícios</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-6">
          <TaskManager teacherId={teacherId} />
        </TabsContent>
        <TabsContent value="exercises" className="mt-6">
          <ExerciseBank teacherId={teacherId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
