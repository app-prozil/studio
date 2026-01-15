import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Book, Calculator, Printer } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const mathImage = PlaceHolderImages.find(img => img.id === 'math-learning');
  const portugueseImage = PlaceHolderImages.find(img => img.id === 'portuguese-reading');
  const printingImage = PlaceHolderImages.find(img => img.id === 'printable-worksheets');

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline text-foreground sm:text-5xl">
          Bem-vindo ao ProZil
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Sua plataforma de aprendizado acessível e divertida.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-8 h-8 text-primary" />
              <span className="text-2xl font-headline">Matemática Divertida</span>
            </CardTitle>
            <CardDescription>
              Aprenda matemática com jogos interativos e desafios.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {mathImage && <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
                <Image
                  src={mathImage.imageUrl}
                  alt={mathImage.description}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={mathImage.imageHint}
                />
            </div>}
            <p className="mb-4 text-muted-foreground">
              Jogos projetados com alto contraste e visuais grandes e claros para ajudar crianças com baixa visão.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/matematica">
                Começar a Jogar <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-8 h-8 text-primary" />
              <span className="text-2xl font-headline">Português Adaptativo</span>
            </CardTitle>
            <CardDescription>
              Exercícios que se adaptam ao seu ritmo de aprendizado.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
             {portugueseImage && <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
                <Image
                  src={portugueseImage.imageUrl}
                  alt={portugueseImage.description}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={portugueseImage.imageHint}
                />
            </div>}
            <p className="mb-4 text-muted-foreground">
              Com suporte de texto para fala e layouts simplificados para facilitar a leitura.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/portugues">
                Começar a Praticar <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="w-8 h-8 text-primary" />
              <span className="text-2xl font-headline">Atividades para Imprimir</span>
            </CardTitle>
            <CardDescription>
              Gere folhas de atividades personalizadas para aprender offline.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {printingImage && <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
                <Image
                  src={printingImage.imageUrl}
                  alt={printingImage.description}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={printingImage.imageHint}
                />
            </div>}
            <p className="mb-4 text-muted-foreground">
              Formatadas para baixa visão com alto contraste e fontes grandes.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/imprimir">
                Gerar Atividade <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
