import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS !== "web" && Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(":")[0];
    return `http://${host}:8081`;
  }
  return "http://localhost:8081";
}

export const apiBaseURL = getApiBaseUrl();

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

