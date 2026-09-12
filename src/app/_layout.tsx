import ThemeProvider from "@/components/ThemeProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import Toast from "react-native-toast-message";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../global.css";
import { authClient } from "../lib/auth-client";
import { queryClient } from "../lib/query-client";

export { RootErrorBoundary as ErrorBoundary } from "@/components/RootErrorBoundary";

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    const inAuthGroup = segments[0] === "sign-in";

    if (!session?.user) {
      if (!inAuthGroup) {
        router.replace("/sign-in");
      }
    } else {
      if (
        inAuthGroup ||
        (segments as string[]).length === 0 ||
        (segments[0] as string) === ""
      ) {
        if ((session.user as any).role === "contractor") {
          router.replace("/contractor/projects" as any);
        } else {
          router.replace("/laborer/projects" as any);
        }
      }
    }
  }, [session, isPending, segments]);

  if (isPending) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-slate-900">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#FFFFFF" },
            }}
          >
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="contractor" />
            <Stack.Screen name="laborer" />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
      <Toast />
    </QueryClientProvider>
  );
}
