import React, { useCallback, useState } from "react";
import { View, ScrollView, useColorScheme, Pressable } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../components/ui/Screen";
import { Text } from "../../../components/ui/Text";
import { PageHeader } from "../../../components/ui/PageHeader";
import { TimesheetView } from "../../../components/TimesheetView";
import { PaymentsView } from "../../../components/PaymentsView";
import { LedgerView } from "../../../components/LedgerView";
import { apiClient } from "../../../lib/http-client";

type Pane = "timesheet" | "payments" | "ledger";
const PANES: { key: Pane; label: string; icon: any }[] = [
  { key: "timesheet", label: "Timesheet", icon: "time-outline" },
  { key: "payments", label: "Payments", icon: "cash-outline" },
  { key: "ledger", label: "Ledger", icon: "wallet-outline" },
];

const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function ProjectDetailScreen() {
  const isDark = useColorScheme() === "dark";
  const params = useLocalSearchParams<{ id: string }>();
  const projectId = String(params.id);

  const [project, setProject] = useState<any>(null);
  const [pane, setPane] = useState<Pane>("timesheet");
  const [stats, setStats] = useState({ pending: 0, ledgerNet: 0, cashNet: 0 });

  const fetchHeader = async () => {
    try {
      const [projRes, pendRes, ledgerRes, payRes]: any = await Promise.all([
        apiClient.get("/api/projects"),
        apiClient.get(`/api/attendance?projectId=${projectId}`),
        apiClient.get(`/api/ledger-invoices?projectId=${projectId}`),
        apiClient.get("/api/payments"),
      ]);

      const found = (projRes.data || []).find((p: any) => p.id === projectId);
      if (found) setProject(found);

      const items = (ledgerRes.data?.data || ledgerRes.data || []).flatMap((s: any) => s.items || []);
      const income = items
        .filter((i: any) => i.type === "Income")
        .reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
      const expense = items
        .filter((i: any) => i.type === "Expense")
        .reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);

      const scopedPayments = (payRes.data || []).filter((p: any) => p.projectId === projectId);
      const cashIn = scopedPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

      const pendingList = (pendRes.data || []).filter((a: any) => a.status === "Pending" || a.status === "pending");

      setStats({
        pending: pendingList.length,
        ledgerNet: income - expense,
        cashNet: cashIn,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHeader();
    }, [projectId]),
  );

  return (
    <Screen>
      <PageHeader title={project?.name || "Project"} />

      <View className="px-5 pb-4">
        {(project?.location || project?.client?.name) && (
          <View className="flex-row flex-wrap gap-x-4 gap-y-1 mb-4">
            {project?.location ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="location-outline" size={13} color={isDark ? "#94A3B8" : "#64748B"} />
                <Text className="text-xs text-slate-500 dark:text-slate-400">{project.location}</Text>
              </View>
            ) : null}
            {project?.client?.name ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="person-outline" size={13} color={isDark ? "#94A3B8" : "#64748B"} />
                <Text className="text-xs text-slate-500 dark:text-slate-400">{project.client.name}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View className="flex-row gap-2 mb-4">
          <Stat
            label="PENDING"
            value={String(stats.pending)}
            tone={stats.pending > 0 ? "amber" : "slate"}
          />
          <Stat label="LEDGER NET" value={money(stats.ledgerNet)} tone={stats.ledgerNet >= 0 ? "indigo" : "orange"} />
          <Stat label="CASH" value={money(stats.cashNet)} tone="slate" />
        </View>

        <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {PANES.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => setPane(p.key)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-md ${pane === p.key ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
            >
              <Ionicons
                name={p.icon}
                size={14}
                color={pane === p.key ? (isDark ? "#FFFFFF" : "#0F172A") : isDark ? "#94A3B8" : "#64748B"}
              />
              <Text
                className={`text-xs font-semibold ${pane === p.key ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {pane === "timesheet" && <TimesheetView projectId={projectId} embedded />}
      {pane === "payments" && (
        <PaymentsView projectId={projectId} projectName={project?.name} embedded />
      )}
      {pane === "ledger" && <LedgerView projectId={projectId} projectName={project?.name} embedded />}
    </Screen>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "amber" | "indigo" | "orange" | "slate" }) {
  const styles = {
    amber: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800",
    slate: "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
  }[tone];
  const labelColor = {
    amber: "text-amber-700 dark:text-amber-400",
    indigo: "text-indigo-700 dark:text-indigo-400",
    orange: "text-orange-700 dark:text-orange-400",
    slate: "text-slate-500 dark:text-slate-400",
  }[tone];

  return (
    <View className={`flex-1 p-3 rounded-xl border ${styles}`}>
      <Text className={`text-[10px] font-semibold mb-1 ${labelColor}`}>{label}</Text>
      <Text className="text-base font-bold text-slate-900 dark:text-slate-50">{value}</Text>
    </View>
  );
}
