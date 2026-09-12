import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { authClient } from "./auth-client";

let apiBaseURL = "http://localhost:8081";

if (process.env.EXPO_PUBLIC_API_URL) {
  apiBaseURL = process.env.EXPO_PUBLIC_API_URL;
} else if (Platform.OS !== "web" && Constants.expoConfig?.hostUri) {
  const host = Constants.expoConfig.hostUri.split(":")[0];
  apiBaseURL = `http://${host}:8081`;
}

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const cookie = await (authClient as any).getCookie();
    if (cookie) {
      config.headers.set("Cookie", cookie);
    }
  } catch {}
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Request failed";
    const customError = new Error(message);
    (customError as any).statusCode = error.response?.status;
    (customError as any).errors = error.response?.data?.errors || null;
    (customError as any).response = error.response;
    return Promise.reject(customError);
  },
);
