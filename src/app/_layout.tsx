import ThemeProvider from "@/components/ThemeProvider";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import Toast from "react-native-toast-message";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../global.css";
import { authClient } from "../lib/auth-client";

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    const inAuthGroup = segments[0] === "sign-in";

    if (!session?.user) {
      // If user is not logged in and they aren't on an auth screen, send them to sign-in
      if (!inAuthGroup) {
        router.replace("/sign-in");
      }
    } else {
      // If user IS logged in and trying to view an auth screen (or root index), send to dashboard
      if (
        inAuthGroup ||
        (segments as string[]).length === 0 ||
        (segments[0] as string) === ""
      ) {
        // Redirect based on custom 'role' field we added to the schema
        if ((session.user as any).role === "contractor") {
          router.replace("/contractor" as any);
        } else {
          router.replace("/laborer" as any);
        }
      }
    }
  }, [session, isPending, segments]);

  // Show a loading spinner while checking auth status
  if (isPending) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-slate-900">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <>
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
    </>
  );
}
