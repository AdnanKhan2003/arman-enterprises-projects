import React from "react";
import { View, ScrollView, RefreshControl, useColorScheme } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  const { data: projects = [], isLoading: isLoadingProjects, refetch: refetchProjects, isRefetching: isRefetchingProjects } = useQuery<any[]>({
    queryKey: ["laborer-projects", session?.user?.id],
    queryFn: async () => {
      const res: any = await apiClient.get("/api/projects");
      return res.data ? res.data.map((r: any) => r.projects || r) : [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: attendance = [], isLoading: isLoadingAttendance, refetch: refetchAttendance, isRefetching: isRefetchingAttendance } = useQuery<any[]>({
    queryKey: ["laborer-attendance", session?.user?.id],
    queryFn: async () => {
      const res: any = await apiClient.get("/api/attendance");
      return res.data?.data || res.data || [];
    },
    enabled: !!session?.user?.id,
  });

  const clockMutation = useMutation({
    mutationFn: async ({ projectId, action }: { projectId: string; action: "check_in" | "check_out" }) => {
      const today = new Date().toISOString().split("T")[0];
      const parsed = MarkAttendanceSchema.parse({
        project_id: projectId,
        work_date: today,
        action,
      });
      return await apiClient.post("/api/attendance", parsed);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["laborer-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["laborer-history"] });
      Toast.show({
        type: "success",
        text1: "Success",
        text2: `Successfully ${variables.action === "check_in" ? "clocked in" : "clocked out"}!`,
      });
    },
    onError: (e: any, variables) => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: e?.message || `Could not ${variables.action === "check_in" ? "clock in" : "clock out"}.`,
      });
    },
  });

  const isRefreshing = isRefetchingProjects || isRefetchingAttendance;

  const onRefresh = async () => {
    await Promise.all([refetchProjects(), refetchAttendance()]);
  };

  return (
    <Screen>
      <View className="flex-row justify-between items-center px-5 pt-8 pb-6">
        <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50">My Jobs</Text>
        <ThemeToggle />
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
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
                      <Button
                        title="Clock In"
                        onPress={() => clockMutation.mutate({ projectId: p.id, action: "check_in" })}
                        loading={clockMutation.isPending && clockMutation.variables?.projectId === p.id}
                        className="py-2 px-4"
                      />
                    );
                  } else if (todayRecord && !todayRecord.checkOutTime) {
                    return (
                      <View className="items-end gap-1">
                        <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ CLOCKED IN</Text>
                        <Button
                          title="Clock Out"
                          variant="outline"
                          onPress={() => clockMutation.mutate({ projectId: p.id, action: "check_out" })}
                          loading={clockMutation.isPending && clockMutation.variables?.projectId === p.id}
                          className="py-1 px-3 border-emerald-500"
                        />
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
