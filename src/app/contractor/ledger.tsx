import React, { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme, Pressable, TextInput } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { authClient } from "../../lib/auth-client";
import { invoicesApi } from "../../api/invoices";
import { projectsApi } from "../../api/projects";
import { contactsApi } from "../../api/contact";
import { exportLedgerToPDF, exportLedgerToExcel } from "../../lib/export";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { CustomModal } from "../../components/ui/CustomModal";
import { Input } from "../../components/ui/Input";

export default function FinancialLedgerScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: session } = authClient.useSession();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  const [refreshing, setRefreshing] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [type, setType] = useState<"Expense" | "Income" | "General">("Expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [thirdPartyName, setThirdPartyName] = useState("");

  const fetchData = async () => {
    if (!session?.user?.id) return;
    
    const [invRes, projRes, clientRes] = await Promise.all([
      invoicesApi.getInvoices(),
      projectsApi.getProjects("contractor", session.user.id),
      contactsApi.getClients(session.user.id)
    ]);

    if (invRes.data) setInvoices(invRes.data);
    if (projRes.data) setProjects(projRes.data);
    if (clientRes.data) setClients(clientRes.data);
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleExportPDF = async () => {
    if (invoices.length === 0) return;
    setIsExportingPDF(true);
    try {
      await exportLedgerToPDF(invoices, session?.user?.name || "Contractor");
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Export Failed' });
    }
    setIsExportingPDF(false);
  };

  const handleExportExcel = async () => {
    if (invoices.length === 0) return;
    setIsExportingExcel(true);
    try {
      await exportLedgerToExcel(invoices, session?.user?.name || "Contractor");
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Export Failed' });
    }
    setIsExportingExcel(false);
  };

  const handleAddTransaction = async () => {
    if (!amount || isNaN(Number(amount))) {
      Toast.show({ type: 'error', text1: 'Invalid Amount' });
      return;
    }

    setIsSubmitting(true);
    const { error } = await invoicesApi.createInvoice({
      type,
      amount,
      description,
      issue_date: issueDate,
      project_id: projectId || undefined,
      client_id: clientId || undefined,
      third_party_name: thirdPartyName || undefined,
    });

    if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to add transaction' });
    } else {
      Toast.show({ type: 'success', text1: 'Success', text2: 'Transaction added' });
      setIsModalVisible(false);
      resetForm();
      fetchData();
    }
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setType("Expense");
    setAmount("");
    setDescription("");
    setProjectId("");
    setClientId("");
    setThirdPartyName("");
  };

  const totalIncome = invoices.filter(i => i.type === "Income").reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpense = invoices.filter(i => i.type === "Expense").reduce((sum, i) => sum + Number(i.amount), 0);
  const net = totalIncome - totalExpense;

  return (
    <Screen>
      <PageHeader title="Financial Ledger" rightElement={
        <Button title="Add" onPress={() => setIsModalVisible(true)} className="py-2 px-4" />
      } />

      <ScrollView 
        contentContainerClassName="px-5 pb-10 mt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
      >
        {/* Summary Cards */}
        <View className="flex-row gap-2 mb-6">
          <View className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3 rounded-xl">
            <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">INCOME</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-50">${totalIncome.toFixed(2)}</Text>
          </View>
          <View className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-xl">
            <Text className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">EXPENSE</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-50">${totalExpense.toFixed(2)}</Text>
          </View>
          <View className={`flex-1 p-3 rounded-xl border ${net >= 0 ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'}`}>
            <Text className={`text-xs font-semibold mb-1 ${net >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-orange-700 dark:text-orange-400'}`}>NET</Text>
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-50">${net.toFixed(2)}</Text>
          </View>
        </View>

        {/* Exports */}
        <View className="flex-row gap-3 mb-6">
          <Button 
            title="Export PDF" 
            variant="outline" 
            onPress={handleExportPDF} 
            loading={isExportingPDF}
            className="flex-1 border-slate-300 dark:border-slate-700" 
          />
          <Button 
            title="Export Excel" 
            variant="outline" 
            onPress={handleExportExcel} 
            loading={isExportingExcel}
            className="flex-1 border-slate-300 dark:border-slate-700" 
          />
        </View>

        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">
          Transactions
        </Text>

        {invoices.length === 0 ? (
          <Text className="text-sm italic text-slate-500 dark:text-slate-400">No transactions recorded yet.</Text>
        ) : (
          invoices.map(inv => (
            <Card key={inv.id} className="mb-3">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View className={`px-2 py-0.5 rounded ${inv.type === 'Income' ? 'bg-emerald-100 dark:bg-emerald-900/50' : inv.type === 'Expense' ? 'bg-red-100 dark:bg-red-900/50' : 'bg-indigo-100 dark:bg-indigo-900/50'}`}>
                      <Text className={`text-[10px] font-bold ${inv.type === 'Income' ? 'text-emerald-700 dark:text-emerald-400' : inv.type === 'Expense' ? 'text-red-700 dark:text-red-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                        {inv.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
                    {inv.project?.name || inv.client?.name || inv.thirdPartyName || "Uncategorized"}
                  </Text>
                  
                  {inv.description ? (
                    <Text className="text-sm text-slate-500 dark:text-slate-400">{inv.description}</Text>
                  ) : null}
                </View>
                
                <Text className={`text-lg font-bold ${inv.type === 'Income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${Number(inv.amount).toFixed(2)}
                </Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add Modal */}
      <CustomModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="New Transaction"
      >
        <View className="flex-row mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <Pressable 
            onPress={() => setType("Expense")} 
            className={`flex-1 py-2 items-center rounded-md ${type === "Expense" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
          >
            <Text className={`font-semibold ${type === "Expense" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>Expense</Text>
          </Pressable>
          <Pressable 
            onPress={() => setType("Income")} 
            className={`flex-1 py-2 items-center rounded-md ${type === "Income" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
          >
            <Text className={`font-semibold ${type === "Income" ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>Income</Text>
          </Pressable>
        </View>

        <Input label="Amount ($)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" />
        <Input label="Date" value={issueDate} onChangeText={setIssueDate} placeholder="YYYY-MM-DD" />
        <Input label="Description (Optional)" value={description} onChangeText={setDescription} placeholder="What was this for?" />

        <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 mt-2">Link To (Optional)</Text>
        
        {/* Simple pills for projects/clients selection to avoid complex dropdowns for now */}
        {projects.length > 0 && (
          <View className="mb-3">
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1">Project</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {projects.map(p => (
                <Pressable 
                  key={p.id}
                  onPress={() => setProjectId(projectId === p.id ? "" : p.id)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${projectId === p.id ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/50 dark:border-blue-400' : 'border-slate-300 dark:border-slate-700 bg-transparent'}`}
                >
                  <Text className={`text-xs ${projectId === p.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>{p.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {clients.length > 0 && (
          <View className="mb-3">
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1">Client</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {clients.map(c => (
                <Pressable 
                  key={c.id}
                  onPress={() => setClientId(clientId === c.id ? "" : c.id)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${clientId === c.id ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/50 dark:border-blue-400' : 'border-slate-300 dark:border-slate-700 bg-transparent'}`}
                >
                  <Text className={`text-xs ${clientId === c.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <Input label="Or 3rd Party Name" value={thirdPartyName} onChangeText={setThirdPartyName} placeholder="e.g. Home Depot, Supplier X" />

        <Button title="Save Transaction" onPress={handleAddTransaction} loading={isSubmitting} className="mt-4" />
      </CustomModal>
    </Screen>
  );
}
