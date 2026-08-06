import React, { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme, Pressable, Modal } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { authApi } from "../../api/auth";
import { authClient } from "../../lib/auth-client";
import { projectsApi } from "../../api/projects";
import { contactsApi } from "../../api/contact";
import { Ionicons } from "@expo/vector-icons";

export default function ContractorDashboard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: session } = authClient.useSession();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactVendorType, setContactVendorType] = useState("");
  const [contactType, setContactType] = useState<"client" | "vendor">("client");
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const [projectsRes, contactsRes] = await Promise.all([
        projectsApi.getProjects("contractor", session.user.id),
        contactsApi.getContractorContacts(session.user.id)
      ]);
      
      if (projectsRes.data) setProjects(projectsRes.data);
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

  const handleCreateProject = async () => {
    if (!projectName.trim() || !session?.user?.id) return;
    setCreating(true);
    await projectsApi.createProject({
      contractor_id: session.user.id,
      name: projectName,
      location: projectLocation,
    });
    setProjectName("");
    setProjectLocation("");
    setProjectModalVisible(false);
    await fetchData();
    setCreating(false);
  };

  const handleCreateContact = async () => {
    if (!contactName.trim() || !session?.user?.id) return;
    setCreating(true);
    if (contactType === "client") {
      await contactsApi.createClient({ 
        contractor_id: session.user.id, 
        name: contactName,
        address: contactAddress,
      });
    } else {
      await contactsApi.createVendor({ 
        contractor_id: session.user.id, 
        name: contactName,
        address: contactAddress,
        vendor_type: contactVendorType,
      });
    }
    setContactName("");
    setContactAddress("");
    setContactVendorType("");
    setContactModalVisible(false);
    await fetchData();
    setCreating(false);
  };

  return (
    <Screen>
      <View className="flex-row justify-between items-center px-5 pt-8 pb-6">
        <View>
          <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50">Dashboard</Text>
          <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">
            Welcome, {session?.user?.name || "Contractor"}
          </Text>
        </View>
        <Pressable onPress={() => authApi.logout()} className="p-2 active:opacity-50">
          <Ionicons name="log-out-outline" size={24} color={isDark ? "#F8FAFC" : "#0F172A"} />
        </Pressable>
      </View>

      <ScrollView 
        contentContainerClassName="px-5 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
      >
        {/* Projects Section */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">Active Projects</Text>
          <Pressable onPress={() => setProjectModalVisible(true)} className="active:opacity-50">
            <Ionicons name="add-circle" size={28} color="#3B82F6" />
          </Pressable>
        </View>
        
        {projects.length === 0 ? (
          <Text className="text-sm italic mt-2 mb-4 text-slate-500 dark:text-slate-400">No projects found. Create one to get started.</Text>
        ) : (
          projects.map(p => (
            <Card key={p.id}>
              <View className="flex-row justify-between items-center">
                <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{p.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#94A3B8" : "#64748B"} />
              </View>
              {p.location && <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.location}</Text>}
              {p.client && <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">Client: {p.client.name}</Text>}
            </Card>
          ))
        )}

        {/* Team/Contacts Section */}
        <View className="flex-row justify-between items-center mb-3 mt-6">
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">Clients & Vendors</Text>
          <Pressable onPress={() => setContactModalVisible(true)} className="active:opacity-50">
            <Ionicons name="add-circle" size={28} color="#3B82F6" />
          </Pressable>
        </View>
        
        {clients.length === 0 && vendors.length === 0 ? (
          <Text className="text-sm italic mt-2 mb-4 text-slate-500 dark:text-slate-400">No contacts added yet.</Text>
        ) : (
          <>
            {clients.map(c => (
              <Card key={c.id}>
                <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{c.name}</Text>
                <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">Client {c.address ? `• ${c.address}` : ""}</Text>
              </Card>
            ))}
            {vendors.map(v => (
              <Card key={v.id}>
                <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{v.name}</Text>
                <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">Vendor {v.vendorType ? `(${v.vendorType})` : ""} {v.address ? `• ${v.address}` : ""}</Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* Create Project Modal */}
      <Modal visible={projectModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-center p-5">
          <View className="rounded-2xl p-6 shadow-lg bg-white dark:bg-slate-800">
            <Text className="text-xl font-bold mb-5 text-slate-900 dark:text-slate-50">New Project</Text>
            <Input 
              label="Project Name" 
              placeholder="e.g. Downtown Highrise" 
              value={projectName} 
              onChangeText={setProjectName} 
            />
            <Input 
              label="Location" 
              placeholder="e.g. 123 Main St, NY" 
              value={projectLocation} 
              onChangeText={setProjectLocation} 
            />
            <View className="flex-row mt-6 gap-3">
              <Button title="Cancel" variant="outline" onPress={() => setProjectModalVisible(false)} className="flex-1" />
              <Button title="Create" onPress={handleCreateProject} loading={creating} className="flex-1" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Contact Modal */}
      <Modal visible={contactModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-center p-5">
          <View className="rounded-2xl p-6 shadow-lg bg-white dark:bg-slate-800">
            <Text className="text-xl font-bold mb-5 text-slate-900 dark:text-slate-50">New Contact</Text>
            <Input 
              label="Contact Name" 
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
            {contactType === "vendor" && (
              <Input 
                label="Vendor Type" 
                placeholder="e.g. Hardware, Plumbing" 
                value={contactVendorType} 
                onChangeText={setContactVendorType} 
              />
            )}
            <View className="flex-row mt-2 gap-3">
              <Button 
                title="Client" 
                variant={contactType === "client" ? "primary" : "secondary"} 
                onPress={() => setContactType("client")} 
                className="flex-1"
              />
              <Button 
                title="Vendor" 
                variant={contactType === "vendor" ? "primary" : "secondary"} 
                onPress={() => setContactType("vendor")} 
                className="flex-1"
              />
            </View>
            <View className="flex-row mt-6 gap-3">
              <Button title="Cancel" variant="outline" onPress={() => setContactModalVisible(false)} className="flex-1" />
              <Button title="Create" onPress={handleCreateContact} loading={creating} className="flex-1" />
            </View>
          </View>
        </View>
      </Modal>

    </Screen>
  );
}


