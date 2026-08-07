import React, { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme, Pressable } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { authApi } from "../../api/auth";
import { authClient } from "../../lib/auth-client";
import { projectsApi } from "../../api/projects";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function ContractorDashboard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: session } = authClient.useSession();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const projectsRes = await projectsApi.getProjects("contractor", session.user.id);
      
      if (projectsRes.data) setProjects(projectsRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session?.user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <Screen>
      <View className="flex-row justify-between items-center px-5 pt-8 pb-6">
        <View>
          <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50">Dashboard</Text>
          <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">
            Welcome, {session?.user?.name || "Contractor"}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <ThemeToggle />
          <Pressable onPress={() => authApi.logout()} className="p-2 active:opacity-50">
            <Ionicons name="log-out-outline" size={24} color={isDark ? "#F8FAFC" : "#0F172A"} />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        contentContainerClassName="px-5 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
      >
        {/* Projects Section */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">Active Projects</Text>
          <Pressable onPress={() => router.push("/contractor/projects" as any)} className="active:opacity-50">
            <Text className="text-blue-500 font-medium">View All</Text>
          </Pressable>
        </View>
        
        {projects.length === 0 ? (
          <Text className="text-sm italic mt-2 mb-4 text-slate-500 dark:text-slate-400">No projects found. Create one to get started.</Text>
        ) : (
          projects.map(p => (
            <Card key={p.id}>
              <View className="flex-row justify-between items-center">
                <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{p.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#94A3B8" : "#64748B"} />
              </View>
              {p.location && <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.location}</Text>}
              {p.client && <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">Client: {p.client.name}</Text>}
            </Card>
          ))
        )}

        <View className="flex-row justify-between items-center mb-3 mt-8">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">Business Management</Text>
        </View>

        <Card className="mb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full items-center justify-center">
              <Ionicons name="business" size={24} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">Projects</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">Manage, edit, and assign laborers to projects</Text>
            </View>
          </View>
          <Button title="Manage Projects" variant="outline" onPress={() => router.push("/contractor/projects" as any)} />
        </Card>
        <Card className="mb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full items-center justify-center">
              <Ionicons name="book" size={24} color="#6366F1" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">Clients & Vendors</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">Manage your contacts address book</Text>
            </View>
          </View>
          <Button title="Manage Contacts" variant="outline" onPress={() => router.push("/contractor/contacts" as any)} />
        </Card>

        <Card className="mb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full items-center justify-center">
              <Ionicons name="time" size={24} color="#10B981" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">Timesheet Approvals</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">Review and approve laborer attendance logs</Text>
            </View>
          </View>
          <Button title="Review Timesheets" variant="outline" onPress={() => router.push("/contractor/timesheets" as any)} />
        </Card>

        <Card className="mb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-full items-center justify-center">
              <Ionicons name="construct" size={24} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">Laborers</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">Create login credentials for your workforce</Text>
            </View>
          </View>
          <Button title="Manage Laborers" variant="outline" onPress={() => router.push("/contractor/laborers" as any)} />
        </Card>

        <Card>
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full items-center justify-center">
              <Ionicons name="wallet" size={24} color="#A855F7" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">Financial Ledger</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">Track income and expenses with PDF/Excel exports</Text>
            </View>
          </View>
          <Button title="View Ledger" variant="outline" onPress={() => router.push("/contractor/ledger" as any)} />
        </Card>
      </ScrollView>
    </Screen>
  );
}


