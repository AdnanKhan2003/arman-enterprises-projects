import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { authClient } from "../lib/auth-client";
import { ActivityIndicator, View, StyleSheet } from "react-native";

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    const inAuthGroup = segments[0] === "sign-in" || segments[0] === "sign-up";

    if (!session?.user) {
      // If user is not logged in and they aren't on an auth screen, send them to sign-in
      if (!inAuthGroup) {
        router.replace("/sign-in");
      }
    } else {
      // If user IS logged in and trying to view an auth screen (or root index), send to dashboard
      if (inAuthGroup || (segments as string[]).length === 0 || (segments[0] as string) === "") {
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" options={{ animation: "fade" }} />
      <Stack.Screen name="sign-up" options={{ animation: "fade" }} />
      {/* Contractor and Laborer dashboards will naturally render if navigated to */}
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
