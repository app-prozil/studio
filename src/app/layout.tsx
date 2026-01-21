import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from '@/components/app-layout';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { PWAInstallProvider } from '@/hooks/use-pwa-install';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';

export const metadata: Metadata = {
  title: 'ProZil',
  description: 'Atividades escolares para crianças com baixa visão e pouca mobilidade.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="ProZil" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ProZil" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PWAInstallProvider>
            <FirebaseClientProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <Toaster />
              <PWAInstallPrompt />
            </FirebaseClientProvider>
          </PWAInstallProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
