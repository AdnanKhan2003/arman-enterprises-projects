import React from "react";
import { Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Pressable 
      onPress={toggleColorScheme} 
      className="p-2 rounded-full active:opacity-50 bg-slate-200 dark:bg-slate-800"
    >
      <Ionicons 
        name={isDark ? "moon" : "sunny"} 
        size={20} 
        color={isDark ? "#F8FAFC" : "#0F172A"} 
      />
    </Pressable>
  );
}
