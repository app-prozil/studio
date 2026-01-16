'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDoc, getDocs, query, where } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Send, Edit, BookCopy, Search, X, Save, Eye, User, FileText, Calendar, Clock, Target, Check, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';


// Schemas
const exerciseSchema = z.object({
  id: z.string().optional(),
  teacherId: z.string(),
  text: z.string().min(5, 'A pergunta deve ter pelo menos 5 caracteres.'),
  options: z.array(z.string().min(1, "A opção não pode estar vazia.")).length(3, 'Deve haver exatamente 3 opções.'),
  answer: z.string().min(1, 'A resposta correta é obrigatória.'),
  subject: z.enum(['matematica', 'portugues']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  studentProzilId: z.string().min(1, 'O ID ProZil do aluno é obrigatório.'),
  subject: z.enum(['matematica', 'portugues']),
  taskType: z.enum(['jogo_interativo', 'folha_imprimivel']),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres.'),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data inválida.' }),
  isCompleted: z.boolean().optional(),
  questions: z.array(exerciseSchema.pick({ text: true, options: true, answer: true })).min(1, 'A tarefa deve ter pelo menos uma questão.'),
});


type Exercise = z.infer<typeof exerciseSchema>;

type PerformanceQuestion = {
  text: string;
  options: string[];
  answer: string;
  studentAnswer?: string;
  attempts?: number;
  status?: 'correct' | 'incorrect' | 'unanswered';
  timeTaken?: number; // in ms
};

type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  teacherId: string;
  studentId: string;
  studentProzilId: string;
  studentName?: string;
  teacherName?: string;
  subject: 'matematica' | 'portugues';
  taskType: 'jogo_interativo' | 'folha_imprimivel';
  isCompleted: boolean;
  completedAt?: string;
  totalTime?: number; // in seconds
  questions: PerformanceQuestion[];
};

type Student = {
  id: string;
  name: string;
  prozilId: string;
};


function ExerciseBank({ teacherId }: { teacherId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<'all' | 'matematica' | 'portugues'>('all');

  const exercisesQuery = useMemoFirebase(() => collection(firestore, 'teachers', teacherId, 'exercises'), [firestore, teacherId]);
  const { data: exercises, isLoading } = useCollection<Exercise>(exercisesQuery);
  
  const form = useForm<Exercise>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: { text: '', options: ['', '', ''], answer: '', subject: 'matematica', difficulty: 'easy', teacherId: teacherId },
  });

  const filteredExercises = useMemo(() => {
    if (isLoading || !exercises) {
      return [];
    }
    if (subjectFilter === 'all') {
      return exercises;
    }
    return exercises.filter((ex) => ex.subject === subjectFilter);
  }, [exercises, subjectFilter, isLoading]);


  useEffect(() => {
    if (editingExercise) {
      form.reset(editingExercise);
    } else {
      form.reset({ text: '', options: ['', '', ''], answer: '', subject: 'matematica', difficulty: 'easy', teacherId: teacherId, id: '' });
    }
  }, [editingExercise, form, teacherId]);

  const onSubmit = (values: Exercise) => {
    setIsSubmitting(true);
    
    if (editingExercise?.id) {
      const exerciseRef = doc(firestore, 'teachers', teacherId, 'exercises', editingExercise.id);
      updateDoc(exerciseRef, values).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: exerciseRef.path,
          operation: 'update',
          requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao atualizar exercício' });
      }).finally(() => {
        toast({ title: 'Exercício atualizado!' });
        setEditingExercise(null);
        form.reset();
        setIsSubmitting(false);
      });
    } else {
      const newExerciseRef = doc(collection(firestore, 'teachers', teacherId, 'exercises'));
      const newExercise = { ...values, id: newExerciseRef.id, teacherId };
      setDoc(newExerciseRef, newExercise).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: newExerciseRef.path,
          operation: 'create',
          requestResourceData: newExercise,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao salvar exercício' });
      }).finally(() => {
        toast({ title: 'Exercício salvo no banco!' });
        form.reset();
        setIsSubmitting(false);
      });
    }
  };

  const handleDelete = () => {
    if (!deletingExercise?.id) return;
    setIsSubmitting(true);
    const exerciseRef = doc(firestore, 'teachers', teacherId, 'exercises', deletingExercise.id);
    deleteDoc(exerciseRef).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: exerciseRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({ variant: 'destructive', title: 'Erro ao excluir' });
    }).finally(() => {
        toast({ title: 'Exercício excluído!' });
        setDeletingExercise(null);
        setIsSubmitting(false);
    });
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
           <div className="flex flex-wrap items-center gap-2 pt-4">
              <Button variant={subjectFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSubjectFilter('all')}>
                Todos ({exercises?.length || 0})
              </Button>
              <Button variant={subjectFilter === 'matematica' ? 'default' : 'outline'} size="sm" onClick={() => setSubjectFilter('matematica')}>
                Matemática ({exercises?.filter(e => e.subject === 'matematica').length || 0})
              </Button>
              <Button variant={subjectFilter === 'portugues' ? 'default' : 'outline'} size="sm" onClick={() => setSubjectFilter('portugues')}>
                Português ({exercises?.filter(e => e.subject === 'portugues').length || 0})
              </Button>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex h-full items-center justify-center pt-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <ul className="space-y-2 h-[480px] overflow-y-auto pr-2">
            {filteredExercises.length > 0 ? filteredExercises.map(ex => (
              <li key={ex.id} className="p-3 border rounded-lg flex justify-between items-start gap-2">
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
            )) : (
              <div className="text-center text-muted-foreground py-8">
                Nenhum exercício encontrado para este filtro.
              </div>
            )}
          </ul>
          )}
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [bankSubjectFilter, setBankSubjectFilter] = useState<'all' | 'matematica' | 'portugues'>('all');
  const [isStudentSelectorOpen, setIsStudentSelectorOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectableStudents, setSelectableStudents] = useState<Student[]>([]);
  const [areStudentsLoading, setAreStudentsLoading] = useState(false);

  const exercisesQuery = useMemoFirebase(() => collection(firestore, 'teachers', teacherId, 'exercises'), [firestore, teacherId]);
  const { data: exercises, isLoading: isLoadingExercises } = useCollection<Exercise>(exercisesQuery);
  const tasksQuery = useMemoFirebase(() => collection(firestore, 'teachers', teacherId, 'tasks'), [firestore, teacherId]);
  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);

  const filteredBankExercises = useMemo(() => {
    if (!exercises) return [];
    if (bankSubjectFilter === 'all') return exercises;
    return exercises.filter(ex => ex.subject === bankSubjectFilter);
  }, [exercises, bankSubjectFilter]);
  
  const filteredStudents = useMemo(() => {
    if (!selectableStudents) return [];
    return selectableStudents.filter(s =>
      (s.name && s.name.toLowerCase().includes(studentSearch.toLowerCase())) ||
      (s.prozilId && s.prozilId.toLowerCase().includes(studentSearch.toLowerCase()))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectableStudents, studentSearch]);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', studentProzilId: '', description: '', dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], subject: 'matematica', taskType: 'jogo_interativo', questions: [], isCompleted: false },
  });

  useEffect(() => {
    if (editingTask) {
        form.reset({
            ...editingTask,
            studentProzilId: editingTask.studentProzilId,
            dueDate: editingTask.dueDate ? format(new Date(editingTask.dueDate), 'yyyy-MM-dd') : '',
        });
        setSelectedExercises((editingTask.questions || []).map((q, i) => ({...q, id: `${editingTask.id}-q-${i}`, subject: editingTask.subject, difficulty: 'easy', teacherId })));
    } else {
        form.reset({ title: '', studentProzilId: '', description: '', dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], subject: 'matematica', taskType: 'jogo_interativo', questions: [], isCompleted: false });
        setSelectedExercises([]);
    }
  }, [editingTask, form, teacherId]);


  useEffect(() => {
    form.setValue('questions', selectedExercises.map(e => ({text: e.text, options: e.options, answer: e.answer})));
  }, [selectedExercises, form]);

  const handleReuse = (taskToReuse: Task) => {
    setEditingTask(null); 
    form.reset({
      ...taskToReuse,
      title: `${taskToReuse.title} (Cópia)`,
      id: undefined,
      studentProzilId: '', 
      isCompleted: false,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
    });
    
    const reusedExercises: Exercise[] = (taskToReuse.questions || []).map((q, i) => ({
      ...q,
      id: `reused-${taskToReuse.id}-q-${i}-${Date.now()}`,
      teacherId: teacherId,
      subject: taskToReuse.subject,
      difficulty: 'easy', 
    }));
    
    setSelectedExercises(reusedExercises);
    toast({ title: 'Tarefa Pronta para Reutilizar', description: 'Atribua a um novo aluno e salve.' });
  };
  
  const handleOpenStudentSelector = async () => {
    if (!teacherId) return;
    setIsStudentSelectorOpen(true);
    if (selectableStudents.length > 0) return; // Do not re-fetch if already loaded

    setAreStudentsLoading(true);
    const studentsColRef = collection(firestore, 'students');
    const q = query(studentsColRef, where('teacherId', '==', teacherId));
    try {
        const querySnapshot = await getDocs(q);
        const students = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
        setSelectableStudents(students);
    } catch (e) {
        console.error("Error fetching students: ", e);
        toast({ variant: "destructive", title: "Erro ao buscar alunos." });
    } finally {
        setAreStudentsLoading(false);
    }
  };


  const onSubmit = async (values: z.infer<typeof taskSchema>) => {
    setIsSubmitting(true);

    let studentUid, studentName, teacherName;
    try {
        const studentsRef = collection(firestore, 'students');
        const q = query(studentsRef, where("prozilId", "==", values.studentProzilId));
        const studentSnap = await getDocs(q);
        
        if (studentSnap.empty) {
            form.setError('studentProzilId', { message: 'ID ProZil do aluno não encontrado.' });
            setIsSubmitting(false);
            return;
        }
        const studentDoc = studentSnap.docs[0];
        studentUid = studentDoc.id;
        studentName = studentDoc.data().name;

        const teacherRef = doc(firestore, 'teachers', teacherId);
        const teacherSnap = await getDoc(teacherRef);
        teacherName = teacherSnap.exists() ? teacherSnap.data().name : 'Professor';
    } catch (e) {
        console.error("Error fetching user data:", e);
        toast({ variant: 'destructive', title: 'Erro ao buscar dados', description: 'Não foi possível encontrar o aluno ou professor.' });
        setIsSubmitting(false);
        return;
    }

    const batch = writeBatch(firestore);
    
    if (editingTask?.id) {
        const taskData = { ...values, teacherId, dueDate: new Date(values.dueDate).toISOString(), studentName, teacherName, studentId: editingTask.studentId };
        const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', editingTask.id);
        const studentTaskRef = doc(firestore, 'students', editingTask.studentId, 'tasks', editingTask.id);
        
        batch.update(teacherTaskRef, taskData);
        batch.update(studentTaskRef, taskData);
    } else {
        const newTaskId = doc(collection(firestore, 'teachers')).id;
        const taskData = { ...values, id: newTaskId, teacherId, isCompleted: false, dueDate: new Date(values.dueDate).toISOString(), studentId: studentUid, studentName, teacherName };

        const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', newTaskId);
        const studentTaskRef = doc(firestore, 'students', studentUid, 'tasks', newTaskId);
        
        batch.set(teacherTaskRef, taskData);
        batch.set(studentTaskRef, taskData);
    }
    
    batch.commit().then(() => {
        toast({ title: editingTask ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!' });
        setEditingTask(null);
        form.reset();
        setSelectedExercises([]);
    }).catch((serverError) => {
        const path = editingTask ? `teachers/${teacherId}/tasks/${editingTask.id}` : `teachers/${teacherId}/tasks`;
        const permissionError = new FirestorePermissionError({ path, operation: 'write', requestResourceData: values });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao salvar tarefa' });
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  const handleDelete = () => {
    if (!deletingTask) return;
    const { id, studentId } = deletingTask;
    setIsSubmitting(true);
    
    const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', id as string);
    const studentTaskRef = doc(firestore, 'students', studentId, 'tasks', id as string);

    const batch = writeBatch(firestore);
    batch.delete(teacherTaskRef);
    batch.delete(studentTaskRef);

    batch.commit().catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: teacherTaskRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao excluir tarefa' });
    }).finally(() => {
      toast({ title: 'Tarefa excluída!' });
      setDeletingTask(null);
      setIsSubmitting(false);
    });
  }

  return (
     <>
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
            <CardTitle>{editingTask ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</CardTitle>
            <CardDescription>{editingTask ? 'Modifique os detalhes da tarefa' : 'Preencha os detalhes e adicione exercícios do seu banco'}</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título da Tarefa</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                
                <FormField
                  control={form.control}
                  name="studentProzilId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID ProZil do Aluno</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input {...field} disabled={!!editingTask} placeholder="Selecione um aluno..."/>
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleOpenStudentSelector}
                          disabled={!!editingTask}
                          aria-label="Buscar Aluno"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Matéria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="matematica">Matemática</SelectItem><SelectItem value="portugues">Português</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="taskType" render={({ field }) => (<FormItem><FormLabel>Tipo de Tarefa</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="jogo_interativo">Jogo Interativo</SelectItem><SelectItem value="folha_imprimivel">Folha Imprimível</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem><FormLabel>Data de Entrega</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     {editingTask && (
                        <FormField
                            control={form.control}
                            name="isCompleted"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-4 md:mt-0">
                                <div className="space-y-0.5">
                                    <FormLabel>Tarefa Concluída</FormLabel>
                                </div>
                                <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    )}
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
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {selectedExercises.map((ex, index) => (
                            <li key={ex.id || index} className="flex items-center justify-between p-2 border rounded-md">
                                <span className="truncate">{ex.text}</span>
                                <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedExercises(prev => prev.filter(p => p.id !== ex.id))}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                            </li> 
                            ))}
                        </ul>
                        <FormMessage>{form.formState.errors.questions?.message}</FormMessage>
                    </CardContent>
                </Card>

                <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />} 
                        {editingTask ? 'Atualizar Tarefa' : 'Atribuir Tarefa'}
                    </Button>
                    {editingTask && <Button type="button" variant="ghost" onClick={() => setEditingTask(null)}>Cancelar</Button>}
                </div>
                </form>
            </Form>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Tarefas Criadas</CardTitle>
                <CardDescription>Visualize e gerencie as tarefas que você atribuiu.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingTasks && <p>Carregando tarefas...</p>}
                <ul className="space-y-2 h-[500px] overflow-y-auto">
                    {tasks?.sort((a,b) => (a.isCompleted ? 1 : -1) - (b.isCompleted ? 1 : -1) || new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map(task => (
                        <li key={task.id} className="p-3 border rounded-lg flex justify-between items-start">
                            <div className="flex-1 space-y-1">
                                <p className="font-semibold">{task.title}</p>
                                <p className="text-sm text-muted-foreground">Para: {task.studentName || task.studentId}</p>
                                <div><Badge variant={task.isCompleted ? 'secondary' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge></div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">...</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href={`/${task.subject}?taskId=${task.id}&studentId=${task.studentId}`}>
                                            <Eye className="mr-2 h-4 w-4"/> Visualizar Jogo
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setEditingTask(task as Task)} className="cursor-pointer">
                                        <Edit className="mr-2 h-4 w-4"/> Editar
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleReuse(task as Task)} className="cursor-pointer">
                                        <BookCopy className="mr-2 h-4 w-4"/> Reutilizar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDeletingTask(task as Task)} className="cursor-pointer text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/> Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
      </div>
      
      <Dialog open={isStudentSelectorOpen} onOpenChange={setIsStudentSelectorOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
            <DialogTitle>Selecionar Aluno</DialogTitle>
            <DialogDescription>
                Selecione um dos seus alunos para atribuir esta tarefa.
            </DialogDescription>
            </DialogHeader>
            <div className="py-2">
            <Input 
                placeholder="Buscar por nome ou ID ProZil..." 
                value={studentSearch} 
                onChange={(e) => setStudentSearch(e.target.value)} 
            />
            </div>
            <div className="space-y-2 h-64 overflow-y-auto pr-2">
              {areStudentsLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                    <div 
                    key={student.id} 
                    className="p-3 border rounded-md cursor-pointer hover:bg-muted"
                    onClick={() => {
                        if (student.prozilId) {
                          form.setValue('studentProzilId', student.prozilId);
                          setIsStudentSelectorOpen(false);
                          setStudentSearch('');
                        }
                    }}
                    >
                    <p className="font-semibold">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.prozilId}</p>
                    </div>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground pt-10">
                    Nenhum aluno encontrado. Você já cadastrou algum aluno?
                </div>
              )}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsStudentSelectorOpen(false)}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
              <DialogHeader><DialogTitle>Adicionar Exercícios do Banco</DialogTitle><DialogDescription>Selecione os exercícios que você quer adicionar a esta tarefa.</DialogDescription></DialogHeader>
               <div className="flex flex-wrap items-center gap-2 pt-2 border-y pb-4">
                  <span className="text-sm font-medium pr-4">Filtrar por:</span>
                  <Button variant={bankSubjectFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setBankSubjectFilter('all')}>Todos</Button>
                  <Button variant={bankSubjectFilter === 'matematica' ? 'default' : 'outline'} size="sm" onClick={() => setBankSubjectFilter('matematica')}>Matemática</Button>
                  <Button variant={bankSubjectFilter === 'portugues' ? 'default' : 'outline'} size="sm" onClick={() => setBankSubjectFilter('portugues')}>Português</Button>
              </div>
              <div className="flex-1 overflow-y-auto pr-4">
                  {isLoadingExercises ? (
                    <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : filteredBankExercises.length > 0 ? (
                    filteredBankExercises.map(ex => (
                      <div key={ex.id} className="flex items-center gap-4 p-2 border-b">
                          <Checkbox 
                              id={`bank-${ex.id}`} 
                              checked={selectedExercises.some(s => s.id === ex.id)}
                              onCheckedChange={(checked) => {
                                  if (checked) {
                                      setSelectedExercises(prev => [...prev, ex]);
                                  } else {
                                      setSelectedExercises(prev => prev.filter(p => p.id !== ex.id));
                                  }
                              }}
                          />
                          <label htmlFor={`bank-${ex.id}`} className="flex-1 cursor-pointer">
                              <p className="font-semibold">{ex.text}</p>
                              <div className="flex gap-2 mt-1">
                                  <Badge variant="secondary">{ex.subject === 'matematica' ? 'Matemática' : 'Português'}</Badge>
                                  <Badge variant="outline">{ex.difficulty}</Badge>
                              </div>
                          </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum exercício encontrado. Crie alguns no Banco de Exercícios.
                    </div>
                  )}
              </div>
              <DialogFooter>
                  <Button onClick={() => setIsBankOpen(false)}>
                    Adicionar {selectedExercises.length > 0 ? `(${selectedExercises.length})` : ''} Exercícios
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingTask} onOpenChange={open => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Tarefa?</AlertDialogTitle><AlertDialogDescription>Esta ação é permanente. A tarefa será removida para o professor e para o aluno.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
     </> 
  );
}

function TaskReportDialog({ task, isOpen, onOpenChange }: { task: Task | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  if (!task) return null;

  const questions = task.questions || [];

  const formatTime = (seconds: number | undefined) => {
    if (seconds === undefined) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatMs = (ms: number | undefined) => {
    if (ms === undefined) return 'N/A';
    return `${(ms / 1000).toFixed(1)}s`;
  }
  
  const correctAnswers = questions.filter(q => q.status === 'correct').length;
  const totalQuestions = questions.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task.title}</DialogTitle>
          <DialogDescription>Relatório de desempenho para {task.studentName || 'aluno desconhecido'}.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y">
            <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd><Badge variant={task.isCompleted ? 'success' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge></dd>
            </div>
            <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Calendar className="w-4 h-4"/> Conclusão</dt>
                <dd className="font-semibold">{task.completedAt ? format(new Date(task.completedAt), 'dd/MM/yy HH:mm', {locale: ptBR}) : 'N/A'}</dd>
            </div>
            <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Clock className="w-4 h-4"/> Tempo Total</dt>
                <dd className="font-semibold">{formatTime(task.totalTime)}</dd>
            </div>
             <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Target className="w-4 h-4"/> Precisão</dt>
                <dd className="font-semibold">{correctAnswers} de {totalQuestions}</dd>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>Pergunta</TableHead>
                        <TableHead>Resposta do Aluno</TableHead>
                        <TableHead>Resposta Correta</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tentativas</TableHead>
                        <TableHead>Tempo</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {questions.map((q, index) => (
                        <TableRow key={index} className={q.status === 'incorrect' ? 'bg-destructive/10' : ''}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium max-w-xs truncate">{q.text}</TableCell>
                            <TableCell>{q.studentAnswer || '-'}</TableCell>
                            <TableCell>{q.answer}</TableCell>
                            <TableCell>
                                {q.status === 'correct' && <Check className="w-5 h-5 text-success" />}
                                {q.status === 'incorrect' && <X className="w-5 h-5 text-destructive" />}
                                {q.status === 'unanswered' || !q.status && <Circle className="w-5 h-5 text-muted-foreground"/>}
                            </TableCell>
                            <TableCell>{q.attempts || '-'}</TableCell>
                            <TableCell>{formatMs(q.timeTaken)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function TasksByStudentView({ teacherId }: { teacherId: string }) {
  const firestore = useFirestore();
  const tasksQuery = useMemoFirebase(
    () => collection(firestore, 'teachers', teacherId, 'tasks'),
    [firestore, teacherId]
  );
  const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);
  const [viewingReport, setViewingReport] = useState<Task | null>(null);

  const tasksByStudent = useMemo(() => {
    if (!tasks) return {};
    return tasks.reduce((acc, task) => {
      const studentIdentifier = task.studentName || task.studentId;
      if (!acc[studentIdentifier]) {
        acc[studentIdentifier] = [];
      }
      acc[studentIdentifier].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Visão Geral por Aluno</CardTitle>
        <CardDescription>Veja todas as tarefas que você atribuiu, agrupadas por aluno.</CardDescription>
      </CardHeader>
      <CardContent>
        {Object.keys(tasksByStudent).length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Nenhuma tarefa atribuída encontrada.</div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(tasksByStudent).map(([studentName, studentTasks]) => (
              <AccordionItem value={studentName} key={studentName}>
                <AccordionTrigger className="text-lg font-medium hover:no-underline">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    {studentName} 
                    <Badge variant="outline">{studentTasks.length} tarefas</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3 pt-2 pl-4">
                    {studentTasks.sort((a,b) => (a.isCompleted ? 1 : -1) - (b.isCompleted ? 1 : -1) || new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map(task => (
                       <li key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-background/50 gap-4">
                           <div className="grid gap-1.5 flex-1">
                               <p className={`font-semibold ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                 {task.title}
                               </p>
                               <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mt-1">
                                   <Badge variant={task.isCompleted ? 'success' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge>
                                   <span>
                                    Data de Entrega: {format(new Date(task.dueDate), "dd/MM/yyyy")}
                                   </span>
                                   <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3"/> {task.questions?.length || 0} questões
                                   </span>
                               </div>
                           </div>
                           <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <Button variant="outline" size="sm" onClick={() => setViewingReport(task)}>
                                  <Eye className="mr-2 h-3 w-3"/> Ver Relatório
                              </Button>
                           </div>
                        </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
    <TaskReportDialog task={viewingReport} isOpen={!!viewingReport} onOpenChange={() => setViewingReport(null)} />
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Gerenciar Tarefas</TabsTrigger>
          <TabsTrigger value="exercises">Banco de Exercícios</TabsTrigger>
          <TabsTrigger value="by-student">Tarefas por Aluno</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-6">
          <TaskManager teacherId={teacherId} />
        </TabsContent>
        <TabsContent value="exercises" className="mt-6">
          <ExerciseBank teacherId={teacherId} />
        </TabsContent>
        <TabsContent value="by-student" className="mt-6">
          <TasksByStudentView teacherId={teacherId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
