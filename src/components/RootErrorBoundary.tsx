import { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { type ErrorBoundaryProps } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./ui/Text";
import { Button } from "./ui/Button";
import { ThemeToggle } from "./ui/ThemeToggle";

export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900 justify-center items-center p-6 relative">
      <View className="absolute top-12 right-6">
        <ThemeToggle />
      </View>

      <View className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 items-center justify-center mb-4">
        <Ionicons name="alert-circle-outline" size={36} color="#ef4444" />
      </View>

      <Text className="text-xl font-bold text-slate-900 dark:text-slate-50 text-center mb-2">
        Something went wrong
      </Text>

      <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 max-w-xs">
        An unexpected error occurred. You can retry to reload the screen without restarting the app.
      </Text>

      <View className="w-full max-w-xs space-y-3">
        <Button
          title="Try Again"
          onPress={retry}
          className="w-full bg-blue-600 dark:bg-blue-600"
        />

        {__DEV__ && (
          <Pressable
            onPress={() => setShowDetails((prev) => !prev)}
            className="py-2 items-center"
          >
            <Text className="text-xs text-slate-500 dark:text-slate-400 underline">
              {showDetails ? "Hide Details" : "Show Details (Dev Only)"}
            </Text>
          </Pressable>
        )}
      </View>

      {__DEV__ && showDetails && (
        <ScrollView className="mt-4 max-h-40 w-full max-w-xs p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Text className="text-xs font-mono text-red-600 dark:text-red-400">
            {error.name}: {error.message}
          </Text>
          {error.stack && (
            <Text className="text-[10px] font-mono text-slate-400 mt-2">
              {error.stack}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
