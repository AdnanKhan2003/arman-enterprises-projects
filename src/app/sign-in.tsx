import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  useColorScheme
} from "react-native";
import { Text } from "../components/ui/Text";
import { Screen } from "../components/ui/Screen";
import { Link } from "expo-router";
import { authClient } from "../lib/auth-client";
import { LoginSchema } from "../api/auth";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSignIn = async () => {
    // Reset errors
    setErrors({});
    
    // Validate with Zod
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const formatted = parsed.error.flatten().fieldErrors;
      setErrors({
        email: formatted.email?.[0],
        password: formatted.password?.[0],
      });
      return;
    }

    setLoading(true);
    const { error } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Login Failed", error.message || "Invalid credentials.");
    } 
    // If successful, our Global Layout Guard (_layout.tsx) will automatically redirect!
  };

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1 justify-center px-6"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View className="bg-white dark:bg-slate-900 p-4">
        <View className="mb-10">
          <Text className="text-3xl font-normal text-black dark:text-white mb-2">SiteLedger</Text>
          <Text className="text-sm font-normal text-slate-500 dark:text-slate-400">Welcome back. Sign in to your account.</Text>
        </View>

        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-[13px] font-medium text-black dark:text-white">Email Address</Text>
            <TextInput
              className={`bg-white dark:bg-slate-800 border ${errors.email ? 'border-black dark:border-white' : 'border-slate-200 dark:border-slate-700'} p-4 text-[15px] text-black dark:text-white`}
              placeholder="name@company.com"
              placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: undefined })) }}
            />
            {errors.email && <Text className="text-black dark:text-white text-xs">{errors.email}</Text>}
          </View>

          <View className="gap-2">
            <Text className="text-[13px] font-medium text-black dark:text-white">Password</Text>
            <View className="relative justify-center">
              <TextInput
                className={`bg-white dark:bg-slate-800 border ${errors.password ? 'border-black dark:border-white' : 'border-slate-200 dark:border-slate-700'} p-4 pr-12 text-[15px] text-black dark:text-white`}
                placeholder="••••••••"
                placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((p) => ({ ...p, password: undefined })) }}
              />
              <Pressable 
                className="absolute right-4 active:opacity-50 p-2" 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={isDark ? "#94A3B8" : "#64748B"} />
              </Pressable>
            </View>
            {errors.password && <Text className="text-black dark:text-white text-xs">{errors.password}</Text>}
          </View>

          <Pressable 
            className="bg-black dark:bg-white p-4 items-center justify-center mt-4 active:opacity-70" 
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={isDark ? "#000000" : "#FFFFFF"} />
            ) : (
              <Text className="text-white dark:text-black text-[15px] font-medium">Sign In</Text>
            )}
          </Pressable>
        </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
