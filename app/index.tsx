import { useEffect } from 'react';
import { router } from 'expo-router';
import { useData } from '@/lib/data-context';
import { LoadingView } from '@/components/ui';

export default function IndexScreen() {
  const { user, isLoading } = useData();

  useEffect(() => {
    if (!isLoading) {
      if (user?.isLoggedIn) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, user]);

  return <LoadingView />;
}
