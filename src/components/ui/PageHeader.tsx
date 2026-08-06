import React from "react";
import { View, Pressable, useColorScheme } from "react-native";
import { Text } from "./Text";
import { ThemeToggle } from "./ThemeToggle";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
}

export function PageHeader({ title, showBack = true }: PageHeaderProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-row items-center justify-between px-5 pt-8 pb-6">
      <View className="flex-row items-center gap-3">
        {showBack && (
          <Pressable onPress={() => router.back()} className="active:opacity-50">
            <Ionicons name="arrow-back" size={24} color={isDark ? "#F8FAFC" : "#0F172A"} />
          </Pressable>
        )}
        <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50">{title}</Text>
      </View>
      <ThemeToggle />
    </View>
  );
}
