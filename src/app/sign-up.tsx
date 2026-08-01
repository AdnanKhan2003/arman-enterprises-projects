import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView
} from "react-native";
import { Link } from "expo-router";
import { authClient } from "../lib/auth-client";
import { z } from "zod";

const SignUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["contractor", "laborer"]),
});

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"contractor" | "laborer">("contractor");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const handleSignUp = async () => {
    setErrors({});
    
    const parsed = SignUpSchema.safeParse({ name, email, password, role });
    if (!parsed.success) {
      const formatted = parsed.error.flatten().fieldErrors;
      setErrors({
        name: formatted.name?.[0],
        email: formatted.email?.[0],
        password: formatted.password?.[0],
      });
      return;
    }

    setLoading(true);
    const { error } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role, // Custom field passed to Better Auth
    } as any); // Cast to any to bypass TS complaining about custom fields not defined in core BetterAuth types
    setLoading(false);

    if (error) {
      Alert.alert("Registration Failed", error.message || "An error occurred.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join SiteLedger to manage your work.</Text>
          </View>

          <View style={styles.form}>
            {/* Role Selector */}
            <View style={styles.roleContainer}>
              <TouchableOpacity 
                style={[styles.roleButton, role === "contractor" && styles.roleButtonActive]}
                onPress={() => setRole("contractor")}
              >
                <Text style={[styles.roleText, role === "contractor" && styles.roleTextActive]}>Contractor</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.roleButton, role === "laborer" && styles.roleButtonActive]}
                onPress={() => setRole("laborer")}
              >
                <Text style={[styles.roleText, role === "laborer" && styles.roleTextActive]}>Laborer</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="John Doe"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={(t) => { setName(t); setErrors((p) => ({ ...p, name: undefined })) }}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="name@company.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: undefined })) }}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                secureTextEntry
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((p) => ({ ...p, password: undefined })) }}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/sign-in" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "400",
    color: "#000000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666666",
  },
  form: {
    gap: 24,
  },
  roleContainer: {
    flexDirection: "row",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E5E5",
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  roleButtonActive: {
    borderColor: "#000000",
  },
  roleText: {
    color: "#666666",
    fontWeight: "400",
    fontSize: 14,
  },
  roleTextActive: {
    color: "#000000",
    fontWeight: "500",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#000000",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: 16,
    fontSize: 15,
    color: "#000000",
  },
  inputError: {
    borderColor: "#000000",
  },
  errorText: {
    color: "#000000",
    fontSize: 12,
  },
  button: {
    backgroundColor: "#000000",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  footerText: {
    color: "#666666",
    fontSize: 14,
  },
  linkText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
