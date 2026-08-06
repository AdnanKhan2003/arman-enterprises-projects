import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

let apiBaseURL = "http://localhost:8081";

if (process.env.EXPO_PUBLIC_API_URL) {
  apiBaseURL = process.env.EXPO_PUBLIC_API_URL;
} else if (Platform.OS !== "web" && Constants.expoConfig?.hostUri) {
  // Dynamically get the Metro bundler IP address for physical devices and emulators
  const host = Constants.expoConfig.hostUri.split(":")[0];
  apiBaseURL = `http://${host}:8081`;
}

export const authClient = createAuthClient({
  baseURL: apiBaseURL,
  plugins: [
    // @ts-expect-error Internal Better Auth type mismatch
    expoClient({
      scheme: "siteledger",
      storagePrefix: "siteledger",
      storage: SecureStore,
    }),
  ],
});

export async function apiFetch(path: string, options?: RequestInit) {
  const response = await fetch(`${apiBaseURL}${path}`, {
    ...options,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      Cookie: (await (authClient as any).getCookie()) || "",
      ...options?.headers,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
