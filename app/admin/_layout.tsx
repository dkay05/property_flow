import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="team-permissions" />
      <Stack.Screen name="blacklist" />
      <Stack.Screen name="whatsapp-ai" />
    </Stack>
  );
}
