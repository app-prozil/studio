'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase } from '@/firebase/provider';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, User } from 'firebase/auth';
import { collection, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const signUpSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  role: z.enum(['teacher', 'student', 'director'], { required_error: 'Por favor, selecione um perfil.' }),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', role: 'student' },
  });

  const role = signUpForm.watch('role');

  async function handleLogin(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: 'Verifique seu email e senha.',
      });
      if (error.code !== 'auth/invalid-credential') {
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignUp(values: z.infer<typeof signUpSchema>) {
    setIsLoading(true);
    let createdUser: User | null = null;

    try {
      // Step 1: Create the auth user
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      createdUser = userCredential.user;

      // Step 2: Prepare the profile data for Firestore
      const firstName = values.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
      const randomDigits = Math.floor(100000 + Math.random() * 900000);
      const prozilId = `${firstName}-${randomDigits}`;

      let roleCollection;
      if (values.role === 'teacher') {
        roleCollection = 'teachers';
      } else if (values.role === 'student') {
        roleCollection = 'students';
      } else {
        roleCollection = 'directors';
      }

      const userDocRef = doc(firestore, roleCollection, createdUser.uid);
      
      const userData: { [key: string]: any } = {
        id: createdUser.uid,
        prozilId: prozilId,
        name: values.name,
        email: values.email,
      };

      if (values.role === 'student') {
        userData.teacherIds = [];
      }

      // Step 3: Write the profile data to Firestore and wait for it to complete.
      await setDoc(userDocRef, userData);

      // Step 4: Success! Redirect to the main page.
      router.push('/');
      
    } catch (error: any) {
      // If the user was created but the process failed afterwards (e.g., Firestore write failed),
      // we must delete the auth user to prevent an orphaned account.
      if (createdUser) {
        try {
          await createdUser.delete();
        } catch (deleteError) {
          console.error("CRITICAL: Failed to clean up orphaned auth user. Please delete manually in Firebase Console:", createdUser.email, deleteError);
        }
      }

      // Display a user-friendly error message
      let title = 'Erro ao criar conta';
      let description = 'Ocorreu um erro inesperado. Por favor, tente novamente.';

      if (error.code === 'auth/email-already-in-use') {
        description = 'Este email já está em uso.';
      } else if (error.name === 'FirebaseError') { // Firestore error
        title = 'Erro ao salvar perfil';
        description = 'Não foi possível salvar seu perfil. Verifique as permissões de escrita no Firestore.';
        // The permission error will be thrown to the overlay by the global listener
      }

      toast({
        variant: 'destructive',
        title: title,
        description: description,
      });
      
      if (error.code !== 'auth/email-already-in-use') {
          console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-full py-12">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Entrar</TabsTrigger>
          <TabsTrigger value="signup">Criar Conta</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Bem-vindo de volta!</CardTitle>
              <CardDescription>Faça login para acessar suas atividades.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Crie sua conta</CardTitle>
              <CardDescription>Comece a usar o ProZil hoje mesmo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <FormField
                    control={signUpForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Eu sou...</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-wrap space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="teacher" />
                              </FormControl>
                              <FormLabel className="font-normal">Professor</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="student" />
                              </FormControl>
                              <FormLabel className="font-normal">Aluno</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="director" />
                              </FormControl>
                              <FormLabel className="font-normal">Diretoria</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Conta
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
