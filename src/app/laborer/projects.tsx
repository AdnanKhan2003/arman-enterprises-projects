import React, { useCallback, useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme } from "react-native";
import { useFocusEffect } from "expo-router";
import Toast from "react-native-toast-message";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { authClient } from "../../lib/auth-client";
import { apiClient } from "../../lib/http-client";
import { MarkAttendanceSchema } from "../../schemas";

export default function LaborerProjectsScreen() {
  const isDark = useColorScheme() === "dark";
  const { data: session } = authClient.useSession();

  const [projects, setProjects] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const [projectsRes, attendanceRes]: any = await Promise.all([
        apiClient.get("/api/projects"),
        apiClient.get("/api/attendance"),
      ]);
      if (projectsRes.data) {
        setProjects(projectsRes.data.map((r: any) => r.projects || r));
      }
      const attendanceList = attendanceRes.data?.data || attendanceRes.data || [];
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

  const handleClockAction = async (projectId: string, action: "check_in" | "check_out") => {
    if (!session?.user?.id) return;
    setLoadingProjectId(projectId);
    const today = new Date().toISOString().split("T")[0];
    try {
      const parsed = MarkAttendanceSchema.parse({
        project_id: projectId,
        work_date: today,
        action,
      });
      await apiClient.post("/api/attendance", parsed);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `Successfully ${action === "check_in" ? "clocked in" : "clocked out"}!`,
      });
      await fetchData();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: e.message || `Could not ${action === "check_in" ? "clock in" : "clock out"}.`,
      });
    } finally {
      setLoadingProjectId(null);
    }
  };

  return (
    <Screen>
      <View className="flex-row justify-between items-center px-5 pt-8 pb-6">
        <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50">My Jobs</Text>
        <ThemeToggle />
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
      >
        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">Assigned Projects</Text>

        {projects.length === 0 ? (
          <Text className="text-sm italic mt-2 mb-4 text-slate-500 dark:text-slate-400">You are not assigned to any projects.</Text>
        ) : (
          projects.map((p) => (
            <Card key={p.id} className="mb-4">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-4">
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{p.name}</Text>
                  {p.location ? <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">{p.location}</Text> : null}
                </View>

                {(() => {
                  const today = new Date().toISOString().split("T")[0];
                  const todayRecord = attendance.find((a) => a.projectId === p.id && a.workDate === today);

                  if (!todayRecord) {
                    return (
                      <Button title="Clock In" onPress={() => handleClockAction(p.id, "check_in")} loading={loadingProjectId === p.id} className="py-2 px-4" />
                    );
                  } else if (todayRecord && !todayRecord.checkOutTime) {
                    return (
                      <View className="items-end gap-1">
                        <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ CLOCKED IN</Text>
                        <Button title="Clock Out" variant="outline" onPress={() => handleClockAction(p.id, "check_out")} loading={loadingProjectId === p.id} className="py-1 px-3 border-emerald-500" />
                      </View>
                    );
                  } else {
                    return (
                      <View className="items-center px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Shift Completed</Text>
                      </View>
                    );
                  }
                })()}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
