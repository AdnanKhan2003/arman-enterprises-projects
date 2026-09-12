import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

let apiBaseURL = "http://localhost:8081";

if (process.env.EXPO_PUBLIC_API_URL) {
  apiBaseURL = process.env.EXPO_PUBLIC_API_URL;
} else if (Platform.OS !== "web" && Constants.expoConfig?.hostUri) {
  const host = Constants.expoConfig.hostUri.split(":")[0];
  apiBaseURL = `http://${host}:8081`;
}

export const authClient = createAuthClient({
  baseURL: apiBaseURL,
  plugins: [
    expoClient({
      scheme: "siteledger",
      storagePrefix: "siteledger",
      storage: SecureStore,
    }) as any,
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

  if (!response.ok) {
    let errorMessage = "Request failed";
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || errorJson.error || JSON.stringify(errorJson);
    } catch {
      errorMessage = await response.text();
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
