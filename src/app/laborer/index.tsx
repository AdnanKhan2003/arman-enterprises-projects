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
import { attendanceApi } from "../../api/attendance";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

export default function LaborerDashboard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: session } = authClient.useSession();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const [projectsRes, attendanceRes] = await Promise.all([
        projectsApi.getProjects("laborer", session.user.id),
        attendanceApi.getLaborerAttendanceHistory(session.user.id)
      ]);
      
      if (projectsRes.data) {
        setProjects(projectsRes.data.map((r: any) => r.projects));
      }
      if (attendanceRes.data) setAttendance(attendanceRes.data);
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

  const handleClockAction = async (projectId: string, action: "check_in" | "check_out") => {
    if (!session?.user?.id) return;
    setLoadingProjectId(projectId);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const res = await attendanceApi.markAttendance({
      project_id: projectId,
      work_date: today,
      action
    });
    
    if (res.error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Could not ${action === "check_in" ? "clock in" : "clock out"}.`
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Successfully ${action === "check_in" ? "clocked in" : "clocked out"}!`
      });
      await fetchData();
    }
    
    setLoadingProjectId(null);
  };

  return (
    <Screen>
      <View className="flex-row justify-between items-center px-5 pt-8 pb-6">
        <View>
          <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50">My Jobs</Text>
          <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">
            Welcome, {session?.user?.name || "Worker"}
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
        {/* Payments Received */}
        <Pressable onPress={() => router.push("/laborer/payments" as any)} className="active:opacity-80 mb-6">
          <View className="flex-row items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-xl">
            <View className="w-11 h-11 bg-emerald-100 dark:bg-emerald-900/50 rounded-full items-center justify-center">
              <Ionicons name="cash" size={22} color="#10B981" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">Payments</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">Track money you received and paid</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? "#94A3B8" : "#64748B"} />
          </View>
        </Pressable>

        {/* Assigned Projects */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">Assigned Projects</Text>
        </View>
        
        {projects.length === 0 ? (
          <Text className="text-sm italic mt-2 mb-4 text-slate-500 dark:text-slate-400">You are not assigned to any projects.</Text>
        ) : (
          projects.map(p => (
            <Card key={p.id} className="mb-4">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-4">
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{p.name}</Text>
                  {p.location ? <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">{p.location}</Text> : null}
                </View>
                
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayRecord = attendance.find(a => a.projectId === p.id && a.workDate === today);
                  
                  if (!todayRecord) {
                    return (
                      <Button 
                        title="Clock In" 
                        onPress={() => handleClockAction(p.id, "check_in")} 
                        loading={loadingProjectId === p.id} 
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
                          onPress={() => handleClockAction(p.id, "check_out")} 
                          loading={loadingProjectId === p.id} 
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

        {/* Attendance History */}
        <View className="flex-row justify-between items-center mb-3 mt-6">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">Recent Activity</Text>
        </View>
        
        {attendance.length === 0 ? (
          <Text className="text-sm italic mt-2 mb-4 text-slate-500 dark:text-slate-400">No recent attendance history.</Text>
        ) : (
          attendance.map(a => (
            <Card key={a.id} className="mb-3">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{a.project?.name || "Unknown Project"}</Text>
                  <Text className="text-sm mt-0.5 text-slate-500 dark:text-slate-400">{new Date(a.workDate).toDateString()}</Text>
                  {a.checkInTime && (
                    <Text className="text-xs mt-1 text-slate-400 dark:text-slate-500 font-medium">
                      In: {new Date(a.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                      {a.checkOutTime ? ` | Out: ${new Date(a.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
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
