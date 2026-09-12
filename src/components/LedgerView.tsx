import React, { useCallback, useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme, Pressable, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Screen } from "./ui/Screen";
import { Text } from "./ui/Text";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { PageHeader } from "./ui/PageHeader";
import { CustomModal } from "./ui/CustomModal";
import { authClient } from "../lib/auth-client";
import { apiClient } from "../lib/http-client";
import { LedgerInvoiceItem } from "../schemas/ledger-invoice";
import { exportLedgerToPDF, exportLedgerToExcel } from "../lib/export";

type Scope = "Income" | "Expense" | "Both";
type LedgerInvoice = {
  id: string;
  title: string | null;
  scope: Scope;
  format: "pdf" | "excel";
  items: LedgerInvoiceItem[];
  createdAt: string;
  projectId: string | null;
  project?: { id: string; name: string } | null;
};

type Tab = "All" | "Expense" | "Income" | "Both";
const TABS: Tab[] = ["All", "Expense", "Income", "Both"];
const TAB_LABEL: Record<Tab, string> = {
  All: "All",
  Expense: "Expense only",
  Income: "Income only",
  Both: "Both only",
};

const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const itemsTotals = (items: LedgerInvoiceItem[]) => {
  const income = items.filter((i) => i.type === "Income").reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const expense = items.filter((i) => i.type === "Expense").reduce((s, i) => s + (Number(i.amount) || 0), 0);
  return { income, expense, net: income - expense };
};

type Props = {
  projectId?: string;
  projectName?: string;
  embedded?: boolean;
};

export function LedgerView({ projectId, projectName, embedded = false }: Props) {
  const isDark = useColorScheme() === "dark";
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const contractorName = session?.user?.name || "Contractor";

  const [invoices, setInvoices] = useState<LedgerInvoice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("All");
  const [projectFilter, setProjectFilter] = useState<"all" | "general">("all");
  const [menuFor, setMenuFor] = useState<LedgerInvoice | null>(null);

  const fetchData = async () => {
    try {
      const res: any = await apiClient.get(`/api/ledger-invoices${projectId ? `?projectId=${projectId}` : ""}`);
      const data = res.data?.items || res.data || [];
      setInvoices(data);
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [session, projectId]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const scoped = projectId || projectFilter === "all" ? invoices : invoices.filter((s) => !s.projectId);
  const allItems = scoped.flatMap((s) => s.items || []);
  const totals = itemsTotals(allItems);
  const visible = tab === "All" ? scoped : scoped.filter((s) => s.scope === tab);

  const nextBillNo = () => {
    let max = 0;
    for (const s of invoices) {
      const m = /Bill_No_(\d+)/i.exec(s.title || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max + 1;
  };

  const handleExport = async (s: LedgerInvoice, fmt: "pdf" | "excel") => {
    try {
      const payload = (s.items || []).map((i) => ({
        id: s.id + "_" + i.date,
        type: i.type,
        amount: i.amount,
        description: i.description,
        issueDate: i.date,
        thirdPartyName: i.entity || undefined,
      }));
      const opts = { projectName: s.project?.name };
      if (fmt === "pdf") await exportLedgerToPDF(payload as any, contractorName, opts);
      else await exportLedgerToExcel(payload as any, contractorName);
    } catch (e) {
      Toast.show({ type: "error", text1: "Export failed" });
    }
  };

  const handleEdit = (s: LedgerInvoice) => {
    router.push({
      pathname: "/contractor/invoice-builder",
      params: {
        id: s.id,
        scope: s.scope,
        format: s.format,
        title: s.title || "",
        items: JSON.stringify(s.items || []),
        projectId: s.projectId || "",
        projectName: s.project?.name || "",
      },
    });
  };

  const handleCreate = () =>
    router.push({
      pathname: "/contractor/invoice-builder",
      params: {
        nextNo: String(nextBillNo()),
        ...(projectId ? { projectId, projectName: projectName || "", lockProject: "1" } : {}),
      },
    });

  const handleDelete = (s: LedgerInvoice) => {
    Alert.alert("Delete invoice", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.delete(`/api/ledger-invoices?id=${s.id}`);
            setInvoices((prev) => prev.filter((x) => x.id !== s.id));
            Toast.show({ type: "success", text1: "Deleted" });
          } catch {
            Toast.show({ type: "error", text1: "Delete failed" });
          }
        },
      },
    ]);
  };

  const body = (
    <>
      <ScrollView
        contentContainerClassName="px-5 pb-10 mt-2"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />
        }
      >
        <View className="flex-row gap-2 mb-5">
          <View className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3 rounded-xl">
            <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">INCOME</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-50">{money(totals.income)}</Text>
          </View>
          <View className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-xl">
            <Text className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">EXPENSE</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-50">{money(totals.expense)}</Text>
          </View>
          <View
            className={`flex-1 p-3 rounded-xl border ${totals.net >= 0 ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800" : "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800"}`}
          >
            <Text
              className={`text-xs font-semibold mb-1 ${totals.net >= 0 ? "text-indigo-700 dark:text-indigo-400" : "text-orange-700 dark:text-orange-400"}`}
            >
              NET
            </Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-50">{money(totals.net)}</Text>
          </View>
        </View>

        <Button title="+  Create Invoice" onPress={handleCreate} className="mb-5" />

        {!projectId && (
          <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-3">
            {(
              [
                ["all", "All projects"],
                ["general", "General only"],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setProjectFilter(key)}
                className={`flex-1 py-2 items-center rounded-md ${projectFilter === key ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
              >
                <Text
                  className={`text-xs font-semibold ${projectFilter === key ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
          {TABS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 py-2 items-center rounded-md ${tab === t ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
            >
              <Text
                className={`text-xs font-semibold ${tab === t ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
              >
                {TAB_LABEL[t]}
              </Text>
            </Pressable>
          ))}
        </View>

        {visible.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="document-text-outline" size={40} color={isDark ? "#475569" : "#CBD5E1"} />
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-3">No invoices here yet.</Text>
            <Text className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tap Create Invoice to build one.</Text>
          </View>
        ) : (
          visible.map((s) => {
            const t = itemsTotals(s.items || []);
            return (
              <Card key={s.id} className="mb-3">
                <View className="flex-row items-start">
                  <Pressable onPress={() => handleEdit(s)} className="flex-1 mr-2 active:opacity-70">
                    <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">
                      {s.title || `${s.scope} invoice`}
                    </Text>
                    <Text className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {new Date(s.createdAt).toLocaleDateString()} · {(s.items || []).length} rows
                    </Text>
                    <View className="flex-row gap-1.5 mt-2 flex-wrap">
                      <ScopeBadge scope={s.scope} />
                      <FormatBadge format={s.format} />
                      {!projectId && <ProjectBadge name={s.project?.name} />}
                    </View>
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Net <Text className="font-bold text-slate-900 dark:text-slate-50">{money(t.net)}</Text>
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setMenuFor(s)} hitSlop={10} className="p-1 active:opacity-50">
                    <Ionicons name="ellipsis-vertical" size={20} color={isDark ? "#94A3B8" : "#475569"} />
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <CustomModal
        visible={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor ? menuFor.title || `${menuFor.scope} invoice` : ""}
      >
        {menuFor && (
          <View>
            <MenuRow
              icon="document-text-outline"
              label={menuFor.format === "pdf" ? "Open as PDF (default)" : "Open as PDF"}
              onPress={() => {
                const s = menuFor;
                setMenuFor(null);
                handleExport(s, "pdf");
              }}
              isDark={isDark}
            />
            <MenuRow
              icon="grid-outline"
              label={menuFor.format === "excel" ? "Open as Excel (default)" : "Open as Excel"}
              onPress={() => {
                const s = menuFor;
                setMenuFor(null);
                handleExport(s, "excel");
              }}
              isDark={isDark}
            />
            <MenuRow
              icon="create-outline"
              label="Edit"
              onPress={() => {
                const s = menuFor;
                setMenuFor(null);
                handleEdit(s);
              }}
              isDark={isDark}
            />
            <MenuRow
              icon="trash-outline"
              label="Delete"
              danger
              onPress={() => {
                const s = menuFor;
                setMenuFor(null);
                handleDelete(s);
              }}
              isDark={isDark}
            />
          </View>
        )}
      </CustomModal>
    </>
  );

  if (embedded) return <View className="flex-1">{body}</View>;

  return (
    <Screen>
      <PageHeader title="Financial Ledger" showBack={false} />
      {body}
    </Screen>
  );
}

function ScopeBadge({ scope }: { scope: Scope }) {
  if (scope === "Income")
    return (
      <View className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40">
        <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Income</Text>
      </View>
    );
  if (scope === "Expense")
    return (
      <View className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40">
        <Text className="text-[10px] font-bold text-red-700 dark:text-red-400">Expense</Text>
      </View>
    );
  return (
    <View className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40">
      <Text className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">Both</Text>
    </View>
  );
}

function FormatBadge({ format }: { format: "pdf" | "excel" }) {
  return (
    <View className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
      <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{format.toUpperCase()}</Text>
    </View>
  );
}

function ProjectBadge({ name }: { name?: string }) {
  return (
    <View className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 flex-row items-center gap-1">
      <Ionicons name={name ? "business" : "albums-outline"} size={9} color="#0284C7" />
      <Text className="text-[10px] font-bold text-sky-700 dark:text-sky-400">{name || "General"}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger,
  isDark,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  danger?: boolean;
  isDark: boolean;
}) {
  const color = danger ? "#EF4444" : isDark ? "#E2E8F0" : "#0F172A";
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-3.5 border-b border-slate-100 dark:border-slate-700 active:opacity-50"
    >
      <Ionicons name={icon} size={20} color={danger ? "#EF4444" : isDark ? "#94A3B8" : "#475569"} />
      <Text className="text-[15px] font-medium" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}
