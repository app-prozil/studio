'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// This event is fired by the browser when the app is installable.
// We're extending the default Event type to include the prompt() method.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallContextType {
  canInstall: boolean;
  isStandalone: boolean;
  triggerInstall: () => void;
}

const PWAInstallContext = createContext<PWAInstallContextType | null>(null);

export const usePWAInstall = (): PWAInstallContextType => {
  const context = useContext(PWAInstallContext);
  if (!context) {
    throw new Error('usePWAInstall must be used within a PWAInstallProvider');
  }
  return context;
};

export const PWAInstallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the app is running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!installPromptEvent) {
      return;
    }

    // Show the install prompt
    installPromptEvent.prompt();

    // Wait for the user to respond to the prompt
    await installPromptEvent.userChoice;

    // We can only use the prompt once, so clear it.
    setInstallPromptEvent(null);
  }, [installPromptEvent]);

  return (
    <PWAInstallContext.Provider value={{ canInstall: !!installPromptEvent, isStandalone, triggerInstall }}>
      {children}
    </PWAInstallContext.Provider>
  );
};
