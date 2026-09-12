import React, { useCallback, useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { authClient } from "../../lib/auth-client";
import { apiClient } from "../../lib/http-client";

export default function LaborerDashboard() {
  const isDark = useColorScheme() === "dark";
  const { data: session } = authClient.useSession();

  const [attendance, setAttendance] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const res: any = await apiClient.get("/api/attendance");
      const attendanceList = res.data?.data || res.data || [];
      setAttendance(attendanceList);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [session?.user?.id]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <Screen>
      <View className="flex-row justify-between items-center px-5 pt-8 pb-6">
        <View>
          <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50">Home</Text>
          <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">Welcome, {session?.user?.name || "Worker"}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <ThemeToggle />
          <Pressable onPress={() => authClient.signOut()} className="p-2 active:opacity-50">
            <Ionicons name="log-out-outline" size={24} color={isDark ? "#F8FAFC" : "#0F172A"} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
      >
        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">Recent Activity</Text>

        {attendance.length === 0 ? (
          <Text className="text-sm italic mt-2 mb-4 text-slate-500 dark:text-slate-400">No recent attendance history.</Text>
        ) : (
          attendance.map((a) => (
            <Card key={a.id} className="mb-3">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{a.project?.name || "Unknown Project"}</Text>
                  <Text className="text-sm mt-0.5 text-slate-500 dark:text-slate-400">{new Date(a.workDate).toDateString()}</Text>
                  {a.checkInTime && (
                    <Text className="text-xs mt-1 text-slate-400 dark:text-slate-500 font-medium">
                      In: {new Date(a.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {a.checkOutTime ? ` | Out: ${new Date(a.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </Text>
                  )}
                </View>
                <View className={`px-2.5 py-1 rounded-full ${a.approvalStatus === "Approved" ? "bg-emerald-100 dark:bg-emerald-900/30" : a.approvalStatus === "Pending" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                  <Text className={`text-xs font-semibold ${a.approvalStatus === "Approved" ? "text-emerald-700 dark:text-emerald-400" : a.approvalStatus === "Pending" ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"}`}>
                    {a.approvalStatus}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
