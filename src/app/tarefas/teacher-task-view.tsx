'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';

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

function TaskList({ teacherId }: { teacherId: string }) {
    const firestore = useFirestore();
    const tasksQuery = useMemoFirebase(
      () => collection(firestore, 'teachers', teacherId, 'tasks'),
      [firestore, teacherId]
    );
    const { data: tasks, isLoading } = useCollection(tasksQuery);

    if (isLoading) {
        return <p>Carregando tarefas...</p>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tarefas Criadas</CardTitle>
                <CardDescription>A lista de tarefas que você criou.</CardDescription>
            </CardHeader>
            <CardContent>
                {tasks && tasks.length > 0 ? (
                    <ul className="space-y-4">
                        {tasks.map(task => (
                            <li key={task.id} className="p-4 border rounded-lg">
                                <h3 className="font-bold">{task.title}</h3>
                                <p className="text-sm text-muted-foreground">Aluno ID: {task.studentId}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                   <span>Matéria: <span className="font-semibold">{task.subject}</span></span>
                                   <span>Dificuldade: <span className="font-semibold">{task.difficulty}</span></span>
                                   <span>Questões: <span className="font-semibold">{task.numberOfQuestions}</span></span>
                                </div>
                                <p className="text-sm">Vencimento: {format(new Date(task.dueDate), 'dd/MM/yyyy')}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-muted-foreground">Nenhuma tarefa criada ainda.</p>
                )}
            </CardContent>
        </Card>
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
      dueDate: new Date().toISOString().split('T')[0],
      difficulty: 'easy',
      numberOfQuestions: 5,
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

    try {
      // Set the task in the teacher's collection
      await setDoc(teacherTaskRef, taskData);
      
      // Set the task in the student's collection
      await setDoc(studentTaskRef, taskData);

      toast({
        title: 'Tarefa criada!',
        description: `A tarefa "${values.title}" foi atribuída com sucesso.`,
      });
      form.reset();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar tarefa',
        description: error.message || 'Ocorreu um problema ao salvar a tarefa. Verifique o ID do aluno e tente novamente.',
      });
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
