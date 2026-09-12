import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  useColorScheme,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { authClient } from "../../lib/auth-client";
import { apiClient } from "../../lib/http-client";
import { CreateLedgerInvoiceSchema, UpdateLedgerInvoiceSchema } from "../../schemas";

type Scope = "Expense" | "Income" | "Both";
type Format = "pdf" | "excel";
type RowType = "Income" | "Expense";

type Row = {
  id: string;
  type: RowType;
  date: string;
  entity: string;
  description: string;
  amount: string;
};

let rowSeq = 0;
const newRow = (type: RowType): Row => ({
  id: `r${Date.now()}_${rowSeq++}`,
  type,
  date: new Date().toISOString().split("T")[0],
  entity: "",
  description: "",
  amount: "",
});

const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtLabel = (f: Format) => (f === "pdf" ? "PDF" : "Excel");

const defaultInvoiceName = (n: number) => `Bill_No_${String(n).padStart(2, "0")}`;

export default function InvoiceBuilderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isDark = useColorScheme() === "dark";
  const { data: session } = authClient.useSession();
  const contractorName = session?.user?.name || "Contractor";

  const params = useLocalSearchParams<{
    id?: string;
    scope?: string;
    format?: string;
    title?: string;
    items?: string;
    nextNo?: string;
    projectId?: string;
    projectName?: string;
    lockProject?: string;
  }>();
  const editId = typeof params.id === "string" && params.id ? params.id : null;
  const nextNo = params.nextNo ? parseInt(params.nextNo as string, 10) || 1 : 1;

  const [step, setStep] = useState<"scope" | "format" | "build">(editId ? "build" : "scope");
  const [scope, setScope] = useState<Scope | null>((params.scope as Scope) || null);
  const [format, setFormat] = useState<Format | null>((params.format as Format) || null);
  const [title, setTitle] = useState<string>((params.title as string) || "");
  const [rows, setRows] = useState<Row[]>(() => {
    if (!params.items) return [];
    try {
      const arr = JSON.parse(params.items as string) as any[];
      return arr.map((it) => ({
        id: `r${Date.now()}_${rowSeq++}`,
        type: it.type === "Income" ? "Income" : "Expense",
        date: it.date || new Date().toISOString().split("T")[0],
        entity: it.entity || "",
        description: it.description || "",
        amount: String(it.amount ?? ""),
      }));
    } catch {
      return [];
    }
  });
  const [savingFmt, setSavingFmt] = useState<Format | null>(null);

  const projectLocked = params.lockProject === "1";
  const [projId, setProjId] = useState<string | null>(params.projectId ? String(params.projectId) : null);

  const { data: projects = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res: any = await apiClient.get("/api/projects");
      return (res.data || []).map((x: any) => ({ id: x.id, name: x.name }));
    },
    enabled: !projectLocked,
  });

  const saveMutation = useMutation({
    mutationFn: async (saveFormat: Format) => {
      const valid = rows.filter((r) => r.amount && !isNaN(Number(r.amount)));
      if (valid.length === 0) {
        throw new Error("Add at least one row with an amount");
      }
      if (!scope) return;

      const items = valid.map((r) => ({
        type: r.type,
        date: r.date,
        entity: r.entity || "",
        description: r.description || "",
        amount: String(r.amount),
      }));

      if (editId) {
        const parsed = UpdateLedgerInvoiceSchema.parse({
          id: editId,
          scope,
          format: saveFormat,
          items,
          title: title || undefined,
          project_id: projId,
        });
        return await apiClient.put("/api/ledger-invoices", parsed);
      } else {
        const parsed = CreateLedgerInvoiceSchema.parse({
          scope,
          format: saveFormat,
          items,
          title: title || undefined,
          project_id: projId,
        });
        return await apiClient.post("/api/ledger-invoices", parsed);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["project-header-stats"] });
      Toast.show({ type: "success", text1: editId ? "Invoice updated" : "Invoice created" });
      router.back();
    },
    onError: (e: any) => {
      Toast.show({ type: "error", text1: e?.message || "Save failed" });
    },
    onSettled: () => {
      setSavingFmt(null);
    },
  });

  const defaultType: RowType = scope === "Income" ? "Income" : "Expense";

  const startBuild = () => {
    if (rows.length === 0) setRows([newRow(defaultType)]);
    if (!title) setTitle(defaultInvoiceName(nextNo));
    setStep("build");
  };

  const addRow = () => setRows((r) => [...r, newRow(defaultType)]);
  const removeRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id));
  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const totalIncome = rows
    .filter((r) => r.type === "Income")
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalExpense = rows
    .filter((r) => r.type === "Expense")
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const net = totalIncome - totalExpense;

  const opposite: Format = format === "pdf" ? "excel" : "pdf";

  const handleSave = (saveFormat: Format) => {
    setSavingFmt(saveFormat);
    saveMutation.mutate(saveFormat);
  };

  return (
    <Screen>
      <PageHeader title={editId ? "Edit Invoice" : "New Invoice"} />

      {!editId && (
        <View className="px-5">
          <StepDots step={step} />
        </View>
      )}

      {step === "scope" && (
        <ScrollView contentContainerClassName="px-5 pb-10">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-1">
            What should this invoice include?
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Choose which transactions you'll enter.
          </Text>

          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">PROJECT</Text>
          {projectLocked ? (
            <View className="flex-row items-center gap-2 border rounded-lg p-3 mb-5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <Ionicons name="business" size={14} color={isDark ? "#94A3B8" : "#64748B"} />
              <Text className="text-[15px] text-slate-500 dark:text-slate-400">
                {params.projectName || "This project"}
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
              <Pressable
                onPress={() => setProjId(null)}
                className={`mr-2 px-3 py-1.5 rounded-full border ${!projId ? "bg-slate-900 border-slate-900 dark:bg-slate-50 dark:border-slate-50" : "border-slate-300 dark:border-slate-700"}`}
              >
                <Text className={`text-xs font-medium ${!projId ? "text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-400"}`}>
                  General
                </Text>
              </Pressable>
              {projects.map((pr) => (
                <Pressable
                  key={pr.id}
                  onPress={() => setProjId(pr.id)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${projId === pr.id ? "bg-slate-900 border-slate-900 dark:bg-slate-50 dark:border-slate-50" : "border-slate-300 dark:border-slate-700"}`}
                >
                  <Text className={`text-xs font-medium ${projId === pr.id ? "text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-400"}`}>
                    {pr.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">SCOPE</Text>

          {(["Expense", "Income", "Both"] as Scope[]).map((s) => (
            <SelectCard
              key={s}
              selected={scope === s}
              icon={s === "Income" ? "trending-up" : s === "Expense" ? "trending-down" : "swap-vertical"}
              title={s === "Both" ? "Both" : `Only ${s.toLowerCase()} invoices`}
              subtitle={
                s === "Expense"
                  ? "Money going out"
                  : s === "Income"
                    ? "Money coming in"
                    : "Income and expense together"
              }
              onPress={() => setScope(s)}
            />
          ))}

          <Button
            title="Continue"
            onPress={() => setStep("format")}
            disabled={!scope}
            className="mt-4"
          />
        </ScrollView>
      )}

      {step === "format" && (
        <ScrollView contentContainerClassName="px-5 pb-10">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-1">
            How do you want to enter it?
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            You'll fill in the data laid out exactly like the file it produces.
          </Text>

          <SelectCard
            selected={format === "pdf"}
            icon="document-text"
            title="PDF view"
            subtitle="A print-ready PDF layout"
            onPress={() => setFormat("pdf")}
          />
          <SelectCard
            selected={format === "excel"}
            icon="grid"
            title="Excel view"
            subtitle="A structured spreadsheet grid"
            onPress={() => setFormat("excel")}
          />

          <View className="flex-row gap-3 mt-4">
            <Button title="Back" variant="outline" onPress={() => setStep("scope")} className="flex-1" />
            <Button title="Continue" onPress={startBuild} disabled={!format} className="flex-1" />
          </View>
        </ScrollView>
      )}

      {step === "build" && (
        <ScrollView contentContainerClassName="px-5 pb-32" horizontal={false}>
          <Input
            label="Invoice name"
            value={title}
            onChangeText={setTitle}
            placeholder="Name this invoice"
          />
          {format === "pdf" ? (
            <PdfTemplate
              contractorName={contractorName}
              rows={rows}
              scope={scope!}
              totals={{ totalIncome, totalExpense, net }}
              onUpdate={updateRow}
              onRemove={removeRow}
            />
          ) : (
            <ExcelTemplate
              contractorName={contractorName}
              rows={rows}
              scope={scope!}
              net={net}
              isDark={isDark}
              onUpdate={updateRow}
              onRemove={removeRow}
            />
          )}

          <Pressable
            onPress={addRow}
            className="flex-row items-center justify-center gap-2 mt-4 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 active:opacity-60"
          >
            <Ionicons name="add" size={18} color={isDark ? "#94A3B8" : "#475569"} />
            <Text className="text-sm font-medium text-slate-600 dark:text-slate-400">Add row</Text>
          </Pressable>
        </ScrollView>
      )}

      {step === "build" && (
        <View className="absolute bottom-0 left-0 right-0 px-5 pt-3 pb-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <View>
            <View className="flex-row gap-3">
              <Button
                title={`Save (${fmtLabel(format!)})`}
                onPress={() => handleSave(format!)}
                loading={savingFmt === format}
                disabled={savingFmt !== null}
                className="flex-1"
              />
              <Button
                title={`Save as ${fmtLabel(opposite)}`}
                variant="secondary"
                onPress={() => handleSave(opposite)}
                loading={savingFmt === opposite}
                disabled={savingFmt !== null}
                className="flex-1"
              />
            </View>
            {!editId && (
              <Button
                title="Back"
                variant="outline"
                onPress={() => setStep("format")}
                className="mt-2"
              />
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}

function StepDots({ step }: { step: "scope" | "format" | "build" }) {
  const idx = step === "scope" ? 0 : step === "format" ? 1 : 2;
  return (
    <View className="flex-row items-center gap-2 mb-4">
      {["Scope", "Format", "Fill in"].map((label, i) => (
        <View key={label} className="flex-row items-center">
          <View
            className={`w-6 h-6 rounded-full items-center justify-center ${
              i <= idx ? "bg-slate-900 dark:bg-slate-50" : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                i <= idx ? "text-white dark:text-slate-900" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {i + 1}
            </Text>
          </View>
          <Text
            className={`text-xs ml-1.5 ${
              i <= idx ? "text-slate-900 dark:text-slate-50 font-medium" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {label}
          </Text>
          {i < 2 && <View className="w-4 h-px bg-slate-200 dark:bg-slate-700 mx-1.5" />}
        </View>
      ))}
    </View>
  );
}

function SelectCard({
  selected,
  icon,
  title,
  subtitle,
  onPress,
}: {
  selected: boolean;
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 p-4 rounded-xl border mb-3 active:opacity-70 ${
        selected
          ? "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800"
          : "border-slate-200 dark:border-slate-700 bg-transparent"
      }`}
    >
      <View
        className={`w-10 h-10 rounded-lg items-center justify-center ${
          selected ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-100 dark:bg-slate-800"
        }`}
      >
        <Ionicons
          name={icon}
          size={20}
          color={selected ? (isDark ? "#0F172A" : "#F8FAFC") : isDark ? "#94A3B8" : "#475569"}
        />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</Text>
        <Text className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={isDark ? "#F8FAFC" : "#0F172A"} />}
    </Pressable>
  );
}

function TypeToggle({
  scope,
  value,
  onChange,
}: {
  scope: Scope;
  value: RowType;
  onChange: (t: RowType) => void;
}) {
  if (scope !== "Both") {
    const isIncome = value === "Income";
    return (
      <View
        className={`px-2 py-1 rounded ${isIncome ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-red-100 dark:bg-red-900/40"}`}
      >
        <Text
          className={`text-[10px] font-bold ${isIncome ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
        >
          {value}
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => onChange(value === "Income" ? "Expense" : "Income")}
      className={`px-2 py-1 rounded active:opacity-60 ${value === "Income" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-red-100 dark:bg-red-900/40"}`}
    >
      <Text
        className={`text-[10px] font-bold ${value === "Income" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}
      >
        {value} ⇄
      </Text>
    </Pressable>
  );
}

function PdfTemplate({
  contractorName,
  rows,
  scope,
  totals,
  onUpdate,
  onRemove,
}: {
  contractorName: string;
  rows: Row[];
  scope: Scope;
  totals: { totalIncome: number; totalExpense: number; net: number };
  onUpdate: (id: string, patch: Partial<Row>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View className="bg-white rounded-lg border border-slate-200 p-4 mt-1" style={{ elevation: 1 }}>
      <View className="flex-row justify-between items-start border-b-2 border-slate-900 pb-3 mb-3">
        <View className="flex-row items-center gap-2">
          <View className="w-9 h-9 rounded-lg bg-slate-900 items-center justify-center">
            <Text className="text-white font-bold text-base">S</Text>
          </View>
          <View>
            <Text className="text-base font-bold text-slate-900">SiteLedger</Text>
            <Text className="text-[10px] text-slate-500">Invoice</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-[11px] font-semibold text-slate-900">Draft invoice</Text>
          <Text className="text-[10px] text-slate-500">{new Date().toLocaleDateString()}</Text>
        </View>
      </View>

      <Text className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">Prepared for</Text>
      <Text className="text-[13px] font-bold text-slate-900 mb-3">{contractorName}</Text>

      <View className="flex-row gap-2 mb-4">
        {scope !== "Expense" && <SummaryBox label="Income" value={money(totals.totalIncome)} color="#059669" />}
        {scope !== "Income" && <SummaryBox label="Expense" value={money(totals.totalExpense)} color="#DC2626" />}
        <SummaryBox label="Net" value={money(totals.net)} color="#0F172A" />
      </View>

      {rows.map((row, i) => (
        <View
          key={row.id}
          className={`flex-row items-center gap-2 py-2 ${i > 0 ? "border-t border-slate-100" : ""}`}
        >
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-1">
              <TypeToggle scope={scope} value={row.type} onChange={(t) => onUpdate(row.id, { type: t })} />
              <TextInput
                value={row.date}
                onChangeText={(v) => onUpdate(row.id, { date: v })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                style={{ fontSize: 11, color: "#64748B", flex: 1 }}
              />
            </View>
            <TextInput
              value={row.entity}
              onChangeText={(v) => onUpdate(row.id, { entity: v })}
              placeholder="Project / client / party"
              placeholderTextColor="#94A3B8"
              style={{ fontSize: 13, fontWeight: "600", color: "#0F172A" }}
            />
            <TextInput
              value={row.description}
              onChangeText={(v) => onUpdate(row.id, { description: v })}
              placeholder="Description"
              placeholderTextColor="#94A3B8"
              style={{ fontSize: 12, color: "#64748B" }}
            />
          </View>
          <View className="items-end">
            <TextInput
              value={row.amount}
              onChangeText={(v) => onUpdate(row.id, { amount: v })}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              style={{ fontSize: 14, fontWeight: "700", textAlign: "right", minWidth: 80, color: row.type === "Income" ? "#059669" : "#DC2626" }}
            />
            <Pressable onPress={() => onRemove(row.id)} hitSlop={8} className="mt-1 active:opacity-50">
              <Ionicons name="trash-outline" size={14} color="#94A3B8" />
            </Pressable>
          </View>
        </View>
      ))}

      <View className="flex-row justify-between border-t-2 border-slate-900 mt-2 pt-2">
        <Text className="text-[12px] font-bold text-slate-900">Net balance</Text>
        <Text className="text-[13px] font-bold text-slate-900">{money(totals.net)}</Text>
      </View>
    </View>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="flex-1 border border-slate-200 rounded-lg p-2.5">
      <Text className="text-[9px] uppercase tracking-wide text-slate-500 mb-0.5">{label}</Text>
      <Text className="text-[14px] font-bold" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}

function ExcelTemplate({
  contractorName,
  rows,
  scope,
  net,
  isDark,
  onUpdate,
  onRemove,
}: {
  contractorName: string;
  rows: Row[];
  scope: Scope;
  net: number;
  isDark: boolean;
  onUpdate: (id: string, patch: Partial<Row>) => void;
  onRemove: (id: string) => void;
}) {
  const border = isDark ? "#334155" : "#E2E8F0";
  const gridHeader = isDark ? "#1E293B" : "#E8EAED";
  const cellText = isDark ? "#F8FAFC" : "#0F172A";
  const colW = { num: 28, date: 96, type: 78, entity: 130, desc: 150, amount: 96 };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator className="mt-1" contentContainerStyle={{ paddingBottom: 4 }}>
      <View style={{ borderWidth: 1, borderColor: border, borderRadius: 6, overflow: "hidden" }}>
        <View style={{ backgroundColor: "#1E293B", paddingVertical: 8, paddingHorizontal: 10, width: colW.num + colW.date + colW.type + colW.entity + colW.desc + colW.amount }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
            {contractorName} — Financial Ledger
          </Text>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: gridHeader }}>
          <GridHead w={colW.num} border={border} label="#" center />
          <GridHead w={colW.date} border={border} label="Date" />
          <GridHead w={colW.type} border={border} label="Type" />
          <GridHead w={colW.entity} border={border} label="Entity" />
          <GridHead w={colW.desc} border={border} label="Description" />
          <GridHead w={colW.amount} border={border} label="Amount" right last />
        </View>

        {rows.map((row, i) => (
          <View key={row.id} style={{ flexDirection: "row" }}>
            <View style={{ width: colW.num, borderRightWidth: 1, borderBottomWidth: 1, borderColor: border, backgroundColor: gridHeader, alignItems: "center", justifyContent: "center", paddingVertical: 6 }}>
              <Pressable onPress={() => onRemove(row.id)} hitSlop={6}>
                <Text style={{ fontSize: 11, color: isDark ? "#94A3B8" : "#64748B" }}>{i + 1}</Text>
              </Pressable>
            </View>
            <GridCell w={colW.date} border={border}>
              <TextInput value={row.date} onChangeText={(v) => onUpdate(row.id, { date: v })} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" style={{ fontSize: 11, color: cellText }} />
            </GridCell>
            <GridCell w={colW.type} border={border}>
              <TypeToggle scope={scope} value={row.type} onChange={(t) => onUpdate(row.id, { type: t })} />
            </GridCell>
            <GridCell w={colW.entity} border={border}>
              <TextInput value={row.entity} onChangeText={(v) => onUpdate(row.id, { entity: v })} placeholder="Entity" placeholderTextColor="#94A3B8" style={{ fontSize: 12, color: cellText }} />
            </GridCell>
            <GridCell w={colW.desc} border={border}>
              <TextInput value={row.description} onChangeText={(v) => onUpdate(row.id, { description: v })} placeholder="Description" placeholderTextColor="#94A3B8" style={{ fontSize: 12, color: cellText }} />
            </GridCell>
            <GridCell w={colW.amount} border={border} last>
              <TextInput
                value={row.amount}
                onChangeText={(v) => onUpdate(row.id, { amount: v })}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={{ fontSize: 12, textAlign: "right", color: row.type === "Income" ? "#059669" : "#DC2626" }}
              />
            </GridCell>
          </View>
        ))}

        <View style={{ flexDirection: "row", borderTopWidth: 2, borderColor: "#1E293B" }}>
          <View style={{ width: colW.num + colW.date + colW.type + colW.entity, borderRightWidth: 1, borderColor: border, backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }} />
          <View style={{ width: colW.desc, borderRightWidth: 1, borderColor: border, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", justifyContent: "center", paddingHorizontal: 6, paddingVertical: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", textAlign: "right", color: cellText }}>Net balance</Text>
          </View>
          <View style={{ width: colW.amount, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", justifyContent: "center", paddingHorizontal: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", textAlign: "right", color: cellText }}>{money(net)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function GridHead({ w, border, label, right, center, last }: { w: number; border: string; label: string; right?: boolean; center?: boolean; last?: boolean }) {
  return (
    <View style={{ width: w, borderBottomWidth: 1, borderRightWidth: last ? 0 : 1, borderColor: border, paddingVertical: 6, paddingHorizontal: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: "#1E293B", textAlign: right ? "right" : center ? "center" : "left" }}>{label}</Text>
    </View>
  );
}

function GridCell({ w, border, last, children }: { w: number; border: string; last?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ width: w, borderBottomWidth: 1, borderRightWidth: last ? 0 : 1, borderColor: border, paddingHorizontal: 6, paddingVertical: 4, justifyContent: "center" }}>
      {children}
    </View>
  );
}
