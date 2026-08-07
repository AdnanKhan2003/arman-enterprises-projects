import React, { useCallback, useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Screen } from "./ui/Screen";
import { Text } from "./ui/Text";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { PageHeader } from "./ui/PageHeader";
import { CustomModal } from "./ui/CustomModal";
import { authClient } from "../lib/auth-client";
import { paymentsApi, PartyType } from "../api/payments";

const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_LABEL: Record<PartyType, string> = {
  contractor: "Contractor",
  laborer: "Laborer",
  client: "Client",
  vendor: "Vendor",
};

type Party = { id: string; name: string };

export function PaymentsView() {
  const isDark = useColorScheme() === "dark";
  const { data: session } = authClient.useSession();
  const myId = session?.user?.id;
  const role = ((session?.user as any)?.role as "contractor" | "laborer") || "laborer";

  const [payments, setPayments] = useState<any[]>([]);
  const [parties, setParties] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"mine" | "others">("mine");

  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState<"paid" | "received">("paid");
  const [cpType, setCpType] = useState<PartyType | null>(null);
  const [cpId, setCpId] = useState("");
  const [cpName, setCpName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const fetchData = async () => {
    const [payRes, partyRes] = await Promise.all([paymentsApi.getPayments(), paymentsApi.getParties()]);
    if (payRes.data) setPayments(payRes.data);
    if (partyRes.data) setParties(partyRes.data);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [session]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const totalReceived = payments.filter((p) => p.toId === myId).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPaid = payments.filter((p) => p.fromId === myId).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const net = totalReceived - totalPaid;

  const isContractor = role === "contractor";
  const mine = payments.filter((p) => p.fromId === myId || p.toId === myId);
  const others = payments.filter((p) => p.fromId !== myId && p.toId !== myId);
  const visible = isContractor ? (tab === "mine" ? mine : others) : payments;

  const typeOptions: PartyType[] =
    role === "contractor" ? ["laborer", "client", "vendor"] : ["contractor", "client", "vendor"];

  const listFor = (t: PartyType | null): Party[] => {
    if (!t || !parties) return [];
    if (t === "laborer") return parties.laborers || [];
    if (t === "contractor") return parties.contractors || [];
    if (t === "client") return parties.clients || [];
    return parties.vendors || [];
  };

  const resetForm = () => {
    setDirection("paid");
    setCpType(null);
    setCpId("");
    setCpName("");
    setAmount("");
    setDescription("");
  };

  const openModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!cpType || !cpId) return Toast.show({ type: "error", text1: "Select who this is with" });
    if (!amount || isNaN(Number(amount))) return Toast.show({ type: "error", text1: "Enter a valid amount" });

    setSubmitting(true);
    const { error } = await paymentsApi.logPayment({
      direction,
      counterparty_type: cpType,
      counterparty_id: cpId,
      counterparty_name: cpName,
      amount,
      payment_date: new Date().toISOString().split("T")[0],
      description: description || undefined,
    });
    setSubmitting(false);

    if (error) {
      Toast.show({ type: "error", text1: "Failed to save payment" });
    } else {
      Toast.show({ type: "success", text1: "Payment saved" });
      setModalVisible(false);
      resetForm();
      fetchData();
    }
  };

  const todayLabel = new Date().toLocaleDateString();

  return (
    <Screen>
      <PageHeader title="Payments" />

      <ScrollView
        contentContainerClassName="px-5 pb-10 mt-2"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />
        }
      >
        {/* Totals */}
        <View className="flex-row gap-2 mb-5">
          <View className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3 rounded-xl">
            <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">RECEIVED</Text>
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">{money(totalReceived)}</Text>
          </View>
          <View className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-xl">
            <Text className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">PAID</Text>
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">{money(totalPaid)}</Text>
          </View>
          <View
            className={`flex-1 p-3 rounded-xl border ${net >= 0 ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800" : "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800"}`}
          >
            <Text
              className={`text-xs font-semibold mb-1 ${net >= 0 ? "text-indigo-700 dark:text-indigo-400" : "text-orange-700 dark:text-orange-400"}`}
            >
              NET
            </Text>
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">{money(net)}</Text>
          </View>
        </View>

        <Button title="+  Add Payment" onPress={openModal} className="mb-5" />

        {isContractor && (
          <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
            {(
              [
                ["mine", "My transactions"],
                ["others", "Others"],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                className={`flex-1 py-2 items-center rounded-md ${tab === key ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
              >
                <Text
                  className={`text-xs font-semibold ${tab === key ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {!isContractor && (
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">History</Text>
        )}

        {visible.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="cash-outline" size={40} color={isDark ? "#475569" : "#CBD5E1"} />
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-3">No payments yet.</Text>
          </View>
        ) : (
          visible.map((p) => {
            const involved = p.fromId === myId || p.toId === myId;

            if (!involved) {
              // Contractor "Others" view: a payment between two other parties.
              return (
                <Card key={p.id} className="mb-3">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-2">
                      <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">
                        {p.fromName} → {p.toName}
                      </Text>
                      <Text className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </Text>
                      {p.description ? (
                        <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">{p.description}</Text>
                      ) : null}
                    </View>
                    <Text className="text-lg font-bold text-slate-700 dark:text-slate-300">{money(Number(p.amount))}</Text>
                  </View>
                </Card>
              );
            }

            const received = p.toId === myId;
            const counterparty = received ? p.fromName : p.toName;
            return (
              <Card key={p.id} className="mb-3">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{counterparty}</Text>
                    <Text className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {received ? "Received" : "Paid"} · {new Date(p.paymentDate).toLocaleDateString()}
                    </Text>
                    {p.description ? (
                      <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">{p.description}</Text>
                    ) : null}
                  </View>
                  <Text
                    className={`text-lg font-bold ${received ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {received ? "+" : "−"}
                    {money(Number(p.amount))}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <CustomModal visible={modalVisible} onClose={() => setModalVisible(false)} title="Add Payment">
        {/* Direction */}
        <View className="flex-row mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {(["paid", "received"] as const).map((d) => (
            <Pressable
              key={d}
              onPress={() => setDirection(d)}
              className={`flex-1 py-2 items-center rounded-md ${direction === d ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
            >
              <Text
                className={`font-semibold ${direction === d ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
              >
                {d === "paid" ? "I paid" : "I received"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Counterparty type */}
        <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          {direction === "paid" ? "Paid to" : "Received from"}
        </Text>
        <View className="flex-row gap-2 mb-3">
          {typeOptions.map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                setCpType(t);
                setCpId("");
                setCpName("");
              }}
              className={`px-3 py-1.5 rounded-full border ${cpType === t ? "bg-slate-900 border-slate-900 dark:bg-slate-50 dark:border-slate-50" : "border-slate-300 dark:border-slate-700"}`}
            >
              <Text className={`text-xs font-medium ${cpType === t ? "text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-400"}`}>
                {TYPE_LABEL[t]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Counterparty entity */}
        {cpType ? (
          listFor(cpType).length === 0 ? (
            <Text className="text-xs italic text-slate-400 dark:text-slate-500 mb-3">
              No {TYPE_LABEL[cpType].toLowerCase()}s available.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {listFor(cpType).map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    setCpId(e.id);
                    setCpName(e.name);
                  }}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${cpId === e.id ? "bg-blue-100 border-blue-500 dark:bg-blue-900/50 dark:border-blue-400" : "border-slate-300 dark:border-slate-700"}`}
                >
                  <Text className={`text-xs ${cpId === e.id ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-400"}`}>
                    {e.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )
        ) : null}

        <Input label="Amount ($)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" />

        {/* Non-editable date, auto today */}
        <Text className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Date</Text>
        <View className="border rounded-lg p-3.5 mb-4 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <Text className="text-[15px] text-slate-500 dark:text-slate-400">{todayLabel} (today)</Text>
        </View>

        <Input label="Note (optional)" value={description} onChangeText={setDescription} placeholder="What was this for?" />

        <Button title="Save Payment" onPress={handleSave} loading={submitting} className="mt-2" />
      </CustomModal>
    </Screen>
  );
}
