'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function StudentTaskView({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const tasksQuery = useMemoFirebase(
    () => (studentId ? collection(firestore, 'students', studentId, 'tasks') : null),
    [firestore, studentId]
  );
  const { data: tasks, isLoading, error } = useCollection(tasksQuery);

  const handleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    if (!studentId) return;
    const taskRef = doc(firestore, 'students', studentId, 'tasks', taskId);
    try {
      await updateDoc(taskRef, { isCompleted: isCompleted });
    } catch (e) {
      console.error("Erro ao atualizar tarefa: ", e);
    }
  };

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-4xl font-bold font-headline">Minhas Tarefas</h1>
        <p className="text-muted-foreground">Aqui estão as atividades que seu professor enviou.</p>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Lista de Atividades</CardTitle>
            <CardDescription>Marque as atividades que você já completou.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading && <p>Carregando suas tarefas...</p>}
            {error && <p className="text-destructive">Ocorreu um erro ao buscar suas tarefas.</p>}
            {tasks && tasks.length > 0 ? (
                 <ul className="space-y-4">
                    {tasks.map(task => (
                        <li key={task.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                           <div className="flex items-center space-x-4">
                             <Checkbox
                                id={`task-${task.id}`}
                                checked={task.isCompleted}
                                onCheckedChange={(checked) => handleTaskCompletion(task.id, !!checked)}
                                className="h-6 w-6"
                             />
                             <div className="grid gap-1.5">
                               <label htmlFor={`task-${task.id}`} className={`font-bold text-lg ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                 {task.title}
                               </label>
                               <p className="text-muted-foreground">{task.description}</p>
                             </div>
                           </div>
                           <div className="text-right">
                            <p className="text-sm font-medium">{task.subject === 'matematica' ? 'Matemática' : 'Português'}</p>
                             <p className="text-xs text-muted-foreground">
                                Entregar até {format(new Date(task.dueDate), "dd 'de' MMMM", { locale: ptBR })}
                             </p>
                           </div>
                        </li>
                    ))}
                 </ul>
            ) : (
                !isLoading && <p className="text-center text-muted-foreground py-8">Você não tem nenhuma tarefa pendente. Parabéns!</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
