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
import Toast from "react-native-toast-message";

export default function LaborerDashboard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: session } = authClient.useSession();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const [projectsRes, attendanceRes] = await Promise.all([
        projectsApi.getProjects("laborer", session.user.id),
        attendanceApi.getLaborerAttendanceHistory(session.user.id)
      ]);
      
      if (projectsRes.data) {
        // Map the structure since it returns { projects: { id, name, client } }
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

  const handleCheckIn = async (projectId: string) => {
    if (!session?.user?.id) return;
    setLoadingProjectId(projectId);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const res = await attendanceApi.markAttendance({
      project_id: projectId,
      work_date: today,
      status: "Present"
    });
    
    if (res.error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not mark attendance.'
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Attendance marked for today!'
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
        {/* Assigned Projects */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">Assigned Projects</Text>
        </View>
        
        {projects.length === 0 ? (
          <Text className="text-sm italic mt-2 mb-4 text-slate-500 dark:text-slate-400">You are not assigned to any projects.</Text>
        ) : (
          projects.map(p => (
            <Card key={p.id}>
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{p.name}</Text>
                  {p.client && <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">Client: {p.client.name}</Text>}
                </View>
                <Button 
                  title="Check In" 
                  onPress={() => handleCheckIn(p.id)} 
                  loading={loadingProjectId === p.id} 
                  className="py-2 px-4" 
                />
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
            <Card key={a.id}>
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{a.project?.name || "Unknown Project"}</Text>
                  <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">{new Date(a.workDate).toDateString()}</Text>
                </View>
                <View className={`px-2.5 py-1 rounded-full ${a.approvalStatus === "Approved" ? "bg-emerald-500" : a.approvalStatus === "Pending" ? "bg-amber-500" : "bg-red-500"}`}>
                  <Text className="text-white text-xs font-semibold">{a.approvalStatus}</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}


