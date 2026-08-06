import React, { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl, Modal, useColorScheme, Pressable } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { CustomModal } from "../../components/ui/CustomModal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { authClient } from "../../lib/auth-client";
import { laborerApi } from "../../api/laborer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

export default function LaborersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: session } = authClient.useSession();
  const router = useRouter();
  
  const [laborers, setLaborers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  
  // Edit State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLaborerId, setEditingLaborerId] = useState<string | null>(null);
  
  // Delete State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [laborerToDelete, setLaborerToDelete] = useState<any>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await laborerApi.getLaborers();
      if (res.laborers) setLaborers(res.laborers);
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

  const handleCreateLaborer = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    
    setCreating(true);
    try {
      await laborerApi.createLaborer({ name, email, password });
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Laborer account created successfully!'
      });
      
      setName("");
      setEmail("");
      setPassword("");
      setModalVisible(false);
      await fetchData();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.message || "Failed to create laborer account"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateLaborer = async () => {
    if (!name.trim() || !editingLaborerId) return;
    
    setCreating(true);
    try {
      await laborerApi.updateLaborerName(editingLaborerId, name);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Laborer updated successfully'
      });
      setEditModalVisible(false);
      setName("");
      setEditingLaborerId(null);
      await fetchData();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.message || "Failed to update laborer"
      });
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteLaborer = async () => {
    if (!laborerToDelete) return;
    
    setCreating(true);
    try {
      await laborerApi.deleteLaborer(laborerToDelete.id);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Laborer deleted successfully'
      });
      setDeleteModalVisible(false);
      setLaborerToDelete(null);
      await fetchData();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.message || "Failed to delete laborer"
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen>
      <PageHeader title="Laborers" />

      <View className="px-5 pb-2 flex-row justify-between items-center">
        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Your Laborers
        </Text>
        <Pressable 
          onPress={() => {
            setName("");
            setEmail("");
            setPassword("");
            setModalVisible(true);
          }} 
          className="active:opacity-50"
        >
          <Ionicons name="add-circle" size={28} color="#3B82F6" />
        </Pressable>
      </View>

      <ScrollView 
        className="flex-1 px-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
      >
        <View className="pb-10">
          {laborers.length === 0 ? (
            <View className="py-10 items-center opacity-50">
              <Ionicons name="people-outline" size={48} color={isDark ? "#94A3B8" : "#64748B"} />
              <Text className="text-center mt-4 text-slate-500 dark:text-slate-400">
                You haven't added any laborers yet.
              </Text>
            </View>
          ) : (
            laborers.map((laborer) => (
              <Card key={laborer.id}>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full items-center justify-center">
                    <Ionicons name="person" size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{laborer.name}</Text>
                    <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">{laborer.email}</Text>
                  </View>
                  <View className="flex-row gap-4">
                    <Pressable 
                      onPress={() => {
                        setEditingLaborerId(laborer.id);
                        setName(laborer.name);
                        setEditModalVisible(true);
                      }}
                      className="active:opacity-50 p-2"
                    >
                      <Ionicons name="pencil" size={20} color="#3B82F6" />
                    </Pressable>
                    <Pressable 
                      onPress={() => {
                        setLaborerToDelete(laborer);
                        setDeleteModalVisible(true);
                      }}
                      className="active:opacity-50 p-2"
                    >
                      <Ionicons name="trash" size={20} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Laborer Modal */}
      <CustomModal visible={modalVisible}>
        <Text className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-50">New Laborer</Text>
        <Text className="text-sm mb-5 text-slate-500 dark:text-slate-400">
          Create login credentials for a laborer. They can use these details to log into the app.
        </Text>

        <Input 
          label="Full Name" 
          placeholder="e.g. John Doe" 
          value={name} 
          onChangeText={setName} 
        />
        
        <Input 
          label="Email Address" 
          placeholder="e.g. john@example.com" 
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input 
          label="Temporary Password" 
          placeholder="e.g. password123" 
          value={password} 
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          rightIcon={
            <Pressable onPress={() => setShowPassword(!showPassword)} className="p-2">
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={isDark ? "#94A3B8" : "#64748B"} />
            </Pressable>
          }
        />

        <View className="flex-row mt-6 gap-3">
          <Button title="Cancel" variant="outline" onPress={() => setModalVisible(false)} className="flex-1" />
          <Button title="Create" onPress={handleCreateLaborer} loading={creating} className="flex-1" />
        </View>
      </CustomModal>

      {/* Edit Laborer Modal */}
      <CustomModal visible={editModalVisible}>
        <Text className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-50">Edit Laborer</Text>
        <Text className="text-sm mb-5 text-slate-500 dark:text-slate-400">
          Update the laborer's full name. Emails cannot be changed.
        </Text>
        <Input 
          label="Full Name" 
          placeholder="e.g. John Doe" 
          value={name} 
          onChangeText={setName} 
        />
        <View className="flex-row mt-6 gap-3">
          <Button title="Cancel" variant="outline" onPress={() => setEditModalVisible(false)} className="flex-1" />
          <Button title="Save Changes" onPress={handleUpdateLaborer} loading={creating} className="flex-1" />
        </View>
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <CustomModal visible={deleteModalVisible}>
        <View className="items-center mb-4">
          <View className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mb-4">
            <Ionicons name="warning" size={32} color="#ef4444" />
          </View>
          <Text className="text-xl font-bold text-center text-slate-900 dark:text-slate-50">Delete Laborer?</Text>
          <Text className="text-base text-center mt-2 text-slate-500 dark:text-slate-400">
            Are you sure you want to delete <Text className="font-bold">{laborerToDelete?.name}</Text>? This action will also delete all their attendance records and assignments. This cannot be undone.
          </Text>
        </View>
        <View className="flex-row mt-4 gap-3">
          <Button 
            title="Cancel" 
            variant="outline" 
            onPress={() => setDeleteModalVisible(false)} 
            className="flex-1" 
            disabled={creating}
          />
          <Pressable 
            className={`flex-1 py-3.5 px-6 rounded-lg items-center justify-center bg-red-500 active:bg-red-600 ${creating ? "opacity-60" : ""}`}
            onPress={confirmDeleteLaborer}
            disabled={creating}
          >
            <Text className="text-[15px] font-semibold text-white">
              {creating ? "Deleting..." : "Delete"}
            </Text>
          </Pressable>
        </View>
      </CustomModal>
    </Screen>
  );
}
