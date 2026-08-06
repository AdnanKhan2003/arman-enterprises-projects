import React, { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme, Pressable, Modal, Alert } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { authClient } from "../../lib/auth-client";
import { contactsApi } from "../../api/contact";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

export default function ContactsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: session } = authClient.useSession();
  const router = useRouter();
  
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"clients" | "vendors">("clients");

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<{id: string, type: "client" | "vendor"} | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactVendorType, setContactVendorType] = useState("");
  const [contactType, setContactType] = useState<"client" | "vendor">("client");
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const contactsRes = await contactsApi.getContractorContacts(session.user.id);
      if (contactsRes.clients) setClients(contactsRes.clients);
      if (contactsRes.vendors) setVendors(contactsRes.vendors);
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

  const openEditModal = (contact: any, type: "client" | "vendor") => {
    setContactType(type);
    setEditingContactId(contact.id);
    setContactName(contact.name || "");
    setContactAddress(contact.address || "");
    setContactPhone(contact.phone || "");
    setContactEmail(contact.email || "");
    setContactVendorType(contact.vendorType || "");
    setContactModalVisible(true);
  };

  const handleSaveContact = async () => {
    if (!contactName.trim() || !session?.user?.id) return;
    setCreating(true);
    try {
      if (editingContactId) {
        if (contactType === "client") {
          await contactsApi.updateClient({
            id: editingContactId,
            name: contactName,
            address: contactAddress,
            phone: contactPhone,
            email: contactEmail,
          });
        } else {
          await contactsApi.updateVendor({
            id: editingContactId,
            name: contactName,
            address: contactAddress,
            vendor_type: contactVendorType,
            phone: contactPhone,
            email: contactEmail,
          });
        }
      } else {
        if (contactType === "client") {
          await contactsApi.createClient({ 
            name: contactName,
            address: contactAddress,
            phone: contactPhone,
            email: contactEmail,
          });
        } else {
          await contactsApi.createVendor({ 
            name: contactName,
            address: contactAddress,
            vendor_type: contactVendorType,
            phone: contactPhone,
            email: contactEmail,
          });
        }
      }
      setContactName("");
      setContactAddress("");
      setContactPhone("");
      setContactEmail("");
      setContactVendorType("");
      setEditingContactId(null);
      setContactModalVisible(false);
      await fetchData();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.message || "Failed to save contact"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteContact = (id: string, type: "client" | "vendor") => {
    setContactToDelete({ id, type });
    setDeleteModalVisible(true);
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    setCreating(true); // Re-use creating state for loading indicator on delete button
    try {
      if (contactToDelete.type === "client") {
        await contactsApi.deleteClient(contactToDelete.id);
      } else {
        await contactsApi.deleteVendor(contactToDelete.id);
      }
      await fetchData();
      setDeleteModalVisible(false);
      setContactToDelete(null);
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.message || "Failed to delete contact"
      });
    } finally {
      setCreating(false);
    }
  };

  const activeData = activeTab === "clients" ? clients : vendors;

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-5 pt-8 pb-6">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="active:opacity-50">
            <Ionicons name="arrow-back" size={24} color={isDark ? "#F8FAFC" : "#0F172A"} />
          </Pressable>
          <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50">Contacts</Text>
        </View>
        <ThemeToggle />
      </View>

      <View className="flex-row px-5 mb-4 gap-2">
        <Pressable 
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'clients' ? 'bg-slate-900 dark:bg-slate-50' : 'bg-slate-200 dark:bg-slate-800'}`}
          onPress={() => setActiveTab("clients")}
        >
          <Text className={`font-medium ${activeTab === 'clients' ? 'text-white dark:text-black' : 'text-slate-600 dark:text-slate-400'}`}>Clients ({clients.length})</Text>
        </Pressable>
        <Pressable 
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'vendors' ? 'bg-slate-900 dark:bg-slate-50' : 'bg-slate-200 dark:bg-slate-800'}`}
          onPress={() => setActiveTab("vendors")}
        >
          <Text className={`font-medium ${activeTab === 'vendors' ? 'text-white dark:text-black' : 'text-slate-600 dark:text-slate-400'}`}>Vendors ({vendors.length})</Text>
        </Pressable>
      </View>

      <ScrollView 
        contentContainerClassName="px-5 pb-20"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
      >
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {activeTab === "clients" ? "Your Clients" : "Your Vendors"}
          </Text>
          <Pressable onPress={() => { 
            setContactType(activeTab === "clients" ? "client" : "vendor"); 
            setEditingContactId(null);
            setContactName("");
            setContactAddress("");
            setContactPhone("");
            setContactEmail("");
            setContactVendorType("");
            setContactModalVisible(true); 
          }} className="active:opacity-50">
            <Ionicons name="add-circle" size={28} color="#3B82F6" />
          </Pressable>
        </View>
        
        {activeData.length === 0 ? (
          <Text className="text-sm italic mt-2 mb-4 text-slate-500 dark:text-slate-400">
            No {activeTab} added yet. Tap the + to add one.
          </Text>
        ) : (
          activeData.map(contact => (
            <Card key={contact.id}>
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full items-center justify-center">
                  <Ionicons name={activeTab === "clients" ? "business" : "hammer"} size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{contact.name}</Text>
                  {contact.address && <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">{contact.address}</Text>}
                  {contact.phone && <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">Phone: {contact.phone}</Text>}
                  {contact.email && <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">Email: {contact.email}</Text>}
                  {activeTab === "vendors" && contact.vendorType && (
                    <Text className="text-xs font-medium text-blue-500 mt-1 uppercase tracking-wide">{contact.vendorType}</Text>
                  )}
                </View>
                <View className="flex-row gap-2">
                  <Pressable onPress={() => openEditModal(contact, activeTab === "clients" ? "client" : "vendor")} className="p-2 active:opacity-50">
                    <Ionicons name="pencil" size={20} color="#64748b" />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteContact(contact.id, activeTab === "clients" ? "client" : "vendor")} className="p-2 active:opacity-50">
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Create/Edit Contact Modal */}
      <Modal visible={contactModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-center p-5">
          <View className="rounded-2xl p-6 shadow-lg bg-white dark:bg-slate-800">
            <Text className="text-xl font-bold mb-5 text-slate-900 dark:text-slate-50">
              {editingContactId ? "Edit" : "New"} {contactType === "client" ? "Client" : "Vendor"}
            </Text>
            <Input 
              label="Name" 
              placeholder="e.g. Acme Corp" 
              value={contactName} 
              onChangeText={setContactName} 
            />
            <Input 
              label="Address" 
              placeholder="e.g. 456 Industrial Blvd" 
              value={contactAddress} 
              onChangeText={setContactAddress} 
            />
            <Input 
              label="Phone Number" 
              placeholder="e.g. 555-123-4567" 
              value={contactPhone} 
              onChangeText={setContactPhone} 
              keyboardType="phone-pad"
            />
            <Input 
              label="Email Address" 
              placeholder="e.g. contact@company.com" 
              value={contactEmail} 
              onChangeText={setContactEmail} 
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {contactType === "vendor" && (
              <Input 
                label="Vendor Type" 
                placeholder="e.g. Hardware, Plumbing" 
                value={contactVendorType} 
                onChangeText={setContactVendorType} 
              />
            )}
            <View className="flex-row mt-6 gap-3">
              <Button title="Cancel" variant="outline" onPress={() => setContactModalVisible(false)} className="flex-1" />
              <Button title={editingContactId ? "Save Changes" : "Create"} onPress={handleSaveContact} loading={creating} className="flex-1" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center p-5">
          <View className="rounded-2xl p-6 shadow-lg bg-white dark:bg-slate-800">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mb-4">
                <Ionicons name="warning" size={32} color="#ef4444" />
              </View>
              <Text className="text-xl font-bold text-center text-slate-900 dark:text-slate-50">Delete Contact?</Text>
              <Text className="text-base text-center mt-2 text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this contact? This action cannot be undone.
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
                onPress={confirmDeleteContact}
                disabled={creating}
              >
                <Text className="text-[15px] font-semibold text-white">
                  {creating ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
