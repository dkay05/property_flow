import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { LoadingView } from '@/components/ui';

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated]);

  return <LoadingView />;
}
