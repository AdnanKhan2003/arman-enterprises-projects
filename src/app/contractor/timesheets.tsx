import React, { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme, Pressable } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { authClient } from "../../lib/auth-client";
import { attendanceApi } from "../../api/attendance";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

export default function TimesheetsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: session } = authClient.useSession();

  const [pendingTimesheets, setPendingTimesheets] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    const { data } = await attendanceApi.getPendingAttendance();
    if (data) setPendingTimesheets(data);
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleReview = async (attendanceId: string, status: "Approved" | "Rejected") => {
    if (!session?.user?.id) return;
    setProcessingId(attendanceId);

    const { error } = await attendanceApi.reviewAttendance(
      attendanceId,
      session.user.id,
      status
    );

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to mark as ${status}`
      });
    } else {
      Toast.show({
        type: 'success',
        text1: status,
        text2: `Timesheet ${status.toLowerCase()} successfully.`
      });
      // Optimistically remove from list
      setPendingTimesheets(prev => prev.filter(t => t.id !== attendanceId));
    }

    setProcessingId(null);
  };

  return (
    <Screen>
      <PageHeader title="Timesheets" />

      <View className="px-5 pb-2">
        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Pending Approvals
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review your laborers' daily clock-ins
        </Text>
      </View>

      <ScrollView 
        contentContainerClassName="px-5 pb-10 mt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
      >
        {pendingTimesheets.length === 0 ? (
          <View className="items-center justify-center py-10 mt-10">
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#10B981" />
            <Text className="text-base text-slate-500 dark:text-slate-400 mt-4 text-center font-medium">
              You're all caught up!
            </Text>
            <Text className="text-sm text-slate-400 dark:text-slate-500 mt-1 text-center">
              No pending timesheets to review.
            </Text>
          </View>
        ) : (
          pendingTimesheets.map(t => (
            <Card key={t.id} className="mb-4">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-4">
                  <Text className="text-base font-bold text-slate-900 dark:text-slate-50">
                    {t.laborer?.name || "Unknown Worker"}
                  </Text>
                  <Text className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                    {t.project?.name || "Unknown Project"}
                  </Text>
                  
                  <View className="mt-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                    <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {new Date(t.workDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    {t.checkInTime ? (
                      <View className="flex-row items-center gap-1.5 mt-1">
                        <View className="w-2 h-2 rounded-full bg-emerald-500" />
                        <Text className="text-sm text-slate-700 dark:text-slate-300">
                          In: {new Date(t.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    ) : null}
                    
                    {t.checkOutTime ? (
                      <View className="flex-row items-center gap-1.5 mt-1.5">
                        <View className="w-2 h-2 rounded-full bg-orange-500" />
                        <Text className="text-sm text-slate-700 dark:text-slate-300">
                          Out: {new Date(t.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center gap-1.5 mt-1.5">
                        <View className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <Text className="text-sm italic text-slate-400 dark:text-slate-500">
                          Not clocked out yet
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View className="gap-2 pt-1">
                  <Pressable 
                    onPress={() => handleReview(t.id, "Approved")}
                    disabled={processingId === t.id}
                    className={`w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 items-center justify-center border border-emerald-200 dark:border-emerald-800 active:bg-emerald-200 dark:active:bg-emerald-800 ${processingId === t.id ? 'opacity-50' : ''}`}
                  >
                    <Ionicons name="checkmark" size={24} color="#10B981" />
                  </Pressable>
                  
                  <Pressable 
                    onPress={() => handleReview(t.id, "Rejected")}
                    disabled={processingId === t.id}
                    className={`w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 items-center justify-center border border-red-200 dark:border-red-800 active:bg-red-200 dark:active:bg-red-800 ${processingId === t.id ? 'opacity-50' : ''}`}
                  >
                    <Ionicons name="close" size={24} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
