import React from "react";
import { View, ScrollView, useColorScheme, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { authClient } from "../../lib/auth-client";

export default function MoreScreen() {
  const isDark = useColorScheme() === "dark";
  const router = useRouter();
  const { data: session } = authClient.useSession();

  return (
    <Screen>
      <PageHeader title="More" showBack={false} />

      <ScrollView contentContainerClassName="px-5 pb-10">
        <Card className="mb-6">
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-full bg-slate-900 dark:bg-slate-50 items-center justify-center">
              <Text className="text-lg font-bold text-white dark:text-slate-900">
                {(session?.user?.name || "C").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {session?.user?.name || "Contractor"}
              </Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">{session?.user?.email}</Text>
            </View>
          </View>
        </Card>

        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">Business Management</Text>

        <MenuCard
          icon="construct"
          iconColor="#F59E0B"
          iconBg="bg-orange-100 dark:bg-orange-900/50"
          title="Laborers"
          subtitle="Create login credentials for your workforce"
          onPress={() => router.push("/contractor/laborers" as any)}
          isDark={isDark}
        />

        <MenuCard
          icon="book"
          iconColor="#6366F1"
          iconBg="bg-indigo-100 dark:bg-indigo-900/50"
          title="Clients & Vendors"
          subtitle="Manage your contacts address book"
          onPress={() => router.push("/contractor/contacts" as any)}
          isDark={isDark}
        />

        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3 mt-6">Account</Text>

        <Pressable
          onPress={() => authClient.signOut()}
          className="flex-row items-center gap-3 py-4 px-4 rounded-xl border border-slate-200 dark:border-slate-700 active:opacity-60"
        >
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text className="text-[15px] font-medium text-red-500">Sign out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function MenuCard({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  isDark,
}: {
  icon: any;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      <Card className="mb-3">
        <View className="flex-row items-center gap-3">
          <View className={`w-12 h-12 rounded-full items-center justify-center ${iconBg}`}>
            <Ionicons name={icon} size={24} color={iconColor} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDark ? "#94A3B8" : "#64748B"} />
        </View>
      </Card>
    </Pressable>
  );
}
