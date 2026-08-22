import React, { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme, Pressable } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { CustomModal } from "../../components/ui/CustomModal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { authClient } from "../../lib/auth-client";
import { projectsApi } from "../../api/projects";
import { contactsApi } from "../../api/contact";
import { laborerApi } from "../../api/laborer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { attendanceApi } from "../../api/attendance";
import Toast from "react-native-toast-message";

export default function ProjectsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: session } = authClient.useSession();

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [laborers, setLaborers] = useState<any[]>([]);
  
  const router = useRouter();
  const [pendingByProject, setPendingByProject] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // State
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);

  // Assignment State
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedLaborerIds, setSelectedLaborerIds] = useState<string[]>([]);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const [projectsRes, contactsRes, laborersRes] = await Promise.all([
        projectsApi.getProjects("contractor", session.user.id),
        contactsApi.getContractorContacts(session.user.id),
        laborerApi.getLaborers(),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);

      // Pending clock-ins per project, so the list shows where review is owed.
      const pendingRes = await attendanceApi.getPendingAttendance();
      const counts: Record<string, number> = {};
      for (const rec of (pendingRes.data as any[]) || []) {
        counts[rec.projectId] = (counts[rec.projectId] || 0) + 1;
      }
      setPendingByProject(counts);
      if (contactsRes.clients) setClients(contactsRes.clients);
      if (laborersRes.laborers) setLaborers(laborersRes.laborers);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleLaborer = (id: string) => {
    setSelectedLaborerIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openCreateModal = () => {
    setProjectName("");
    setProjectLocation("");
    setProjectDescription("");
    setSelectedClientId(null);
    setSelectedLaborerIds([]);
    setEditingProjectId(null);
    setModalVisible(true);
  };

  const openEditModal = (project: any) => {
    setProjectName(project.name);
    setProjectLocation(project.location || "");
    setProjectDescription(project.description || "");
    setSelectedClientId(project.client?.id || null);
    setSelectedLaborerIds(project.laborerIds || []);
    setEditingProjectId(project.id);
    setEditModalVisible(true);
  };

  const openDeleteModal = (project: any) => {
    setProjectToDelete(project);
    setDeleteModalVisible(true);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !session?.user?.id) return;
    
    setCreating(true);
    try {
      const { data, error } = await projectsApi.createProject({
        contractor_id: session.user.id,
        name: projectName,
        location: projectLocation,
        description: projectDescription,
        client_id: selectedClientId || undefined,
        laborer_ids: selectedLaborerIds,
      });

      if (error) throw error;
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Project created successfully'
      });
      setModalVisible(false);
      setProjectName("");
      setProjectLocation("");
      setProjectDescription("");
      setSelectedClientId(null);
      setSelectedLaborerIds([]);
      await fetchData();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.message || "Failed to create project"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!projectName.trim() || !editingProjectId) return;
    
    setCreating(true);
    try {
      const { data, error } = await projectsApi.updateProject(editingProjectId, {
        name: projectName,
        location: projectLocation,
        description: projectDescription,
        client_id: selectedClientId || undefined,
        laborer_ids: selectedLaborerIds,
      });

      if (error) throw error;
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Project updated successfully'
      });
      setEditModalVisible(false);
      setProjectName("");
      setProjectLocation("");
      setProjectDescription("");
      setEditingProjectId(null);
      setSelectedClientId(null);
      setSelectedLaborerIds([]);
      await fetchData();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.message || "Failed to update project"
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (project: any) => {
    const next = project.status === "completed" ? "active" : "completed";
    const { error } = await projectsApi.setProjectStatus(project.id, next);
    if (error) {
      Toast.show({ type: "error", text1: "Could not update project" });
      return;
    }
    setProjects((prev) => prev.map((x) => (x.id === project.id ? { ...x, status: next } : x)));
    Toast.show({
      type: "success",
      text1: next === "completed" ? "Marked completed" : "Project reopened",
    });
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    setCreating(true);
    try {
      const { error } = await projectsApi.deleteProject(projectToDelete.id);
      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Project deleted successfully'
      });
      setDeleteModalVisible(false);
      setProjectToDelete(null);
      await fetchData();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.message || "Failed to delete project"
      });
    } finally {
      setCreating(false);
    }
  };

  const renderClientPills = () => (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Assign Client (Optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {clients.map(client => {
          const isSelected = selectedClientId === client.id;
          return (
            <Pressable 
              key={client.id}
              onPress={() => setSelectedClientId(isSelected ? null : client.id)}
              className={`px-4 py-2 rounded-full mr-2 border ${isSelected ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/50' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
            >
              <Text className={`${isSelected ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                {client.name}
              </Text>
            </Pressable>
          )
        })}
        {clients.length === 0 && <Text className="text-slate-500 italic">No clients available</Text>}
      </ScrollView>
    </View>
  );

  const renderLaborerPills = () => (
    <View className="mb-2">
      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Assign Laborers (Optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {laborers.map(laborer => {
          const isSelected = selectedLaborerIds.includes(laborer.id);
          return (
            <Pressable 
              key={laborer.id}
              onPress={() => toggleLaborer(laborer.id)}
              className={`px-4 py-2 rounded-full mr-2 border ${isSelected ? 'bg-indigo-100 border-indigo-500 dark:bg-indigo-900/50' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
            >
              <Text className={`${isSelected ? 'text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                {laborer.name}
              </Text>
            </Pressable>
          )
        })}
        {laborers.length === 0 && <Text className="text-slate-500 italic">No laborers available</Text>}
      </ScrollView>
    </View>
  );

  return (
    <Screen>
      <PageHeader title="Projects" showBack={false} />

      <View className="px-5 pb-2 flex-row justify-between items-center">
        <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Your Projects
        </Text>
        <Pressable onPress={openCreateModal} className="active:opacity-50">
          <Ionicons name="add-circle" size={28} color="#3B82F6" />
        </Pressable>
      </View>

      <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mx-5 mb-3">
        {(
          [
            ["active", "Active"],
            ["all", "All"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setStatusFilter(key)}
            className={"flex-1 py-2 items-center rounded-md " + (statusFilter === key ? "bg-white dark:bg-slate-700 shadow-sm" : "")}
          >
            <Text
              className={"text-xs font-semibold " + (statusFilter === key ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400")}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView 
        contentContainerClassName="px-5 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
      >
        {projects.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Ionicons name="construct-outline" size={48} color={isDark ? "#475569" : "#94A3B8"} />
            <Text className="text-base text-slate-500 dark:text-slate-400 mt-4 text-center">
              You haven't added any projects yet.
            </Text>
          </View>
        ) : (
          projects
            .filter((p) => statusFilter === "all" || p.status !== "completed")
            .sort((a, b) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0))
            .map(p => (
            <Card key={p.id} className="mb-4">
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => router.push(("/contractor/project/" + p.id) as any)}
                  className="flex-row items-center flex-1 active:opacity-70"
                >
                  <View className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full items-center justify-center mr-4">
                    <Ionicons name="business" size={24} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{p.name}</Text>
                      {p.status === "completed" ? (
                        <View className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                          <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300">COMPLETED</Text>
                        </View>
                      ) : null}
                    </View>
                    {p.location ? <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">{p.location}</Text> : null}
                    {p.client ? <Text className="text-sm mt-1 text-slate-500 dark:text-slate-400">Client: {p.client.name}</Text> : null}
                    {p.laborerIds?.length > 0 ? (
                      <Text className="text-sm mt-1 text-indigo-500 dark:text-indigo-400 font-medium">
                        {p.laborerIds.length} {p.laborerIds.length === 1 ? 'Laborer' : 'Laborers'} Assigned
                      </Text>
                    ) : null}
                    {pendingByProject[p.id] > 0 ? (
                      <View className="flex-row items-center gap-1 mt-2 self-start px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40">
                        <Ionicons name="time" size={10} color="#B45309" />
                        <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          {pendingByProject[p.id]} pending
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
                <View className="flex-row gap-4 ml-4">
                  <Pressable
                    onPress={() => toggleStatus(p)}
                    className="active:opacity-50 p-2"
                  >
                    <Ionicons
                      name={p.status === "completed" ? "refresh" : "checkmark-done"}
                      size={20}
                      color="#10B981"
                    />
                  </Pressable>
                  <Pressable 
                    onPress={() => openEditModal(p)}
                    className="active:opacity-50 p-2"
                  >
                    <Ionicons name="pencil" size={20} color="#3B82F6" />
                  </Pressable>
                  <Pressable 
                    onPress={() => openDeleteModal(p)}
                    className="active:opacity-50 p-2"
                  >
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Create Project Modal */}
      <CustomModal visible={modalVisible}>
        <Text className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-50">New Project</Text>
        <Text className="text-sm mb-5 text-slate-500 dark:text-slate-400">
          Create a new project and assign your team.
        </Text>
        <ScrollView className="max-h-[65vh]" showsVerticalScrollIndicator={false}>
          <Input 
            label="Project Name" 
            placeholder="e.g. Downtown Highrise" 
            value={projectName} 
            onChangeText={setProjectName} 
          />
          <Input 
            label="Location (Optional)" 
            placeholder="e.g. 123 Main St, NY" 
            value={projectLocation} 
            onChangeText={setProjectLocation} 
          />
          <Input 
            label="Description (Optional)" 
            placeholder="e.g. Phase 1 foundation work" 
            value={projectDescription} 
            onChangeText={setProjectDescription} 
          />
          
          {renderClientPills()}
          {renderLaborerPills()}
          
        </ScrollView>
        <View className="flex-row mt-6 gap-3">
          <Button title="Cancel" variant="outline" onPress={() => setModalVisible(false)} className="flex-1" />
          <Button title="Create" onPress={handleCreateProject} loading={creating} className="flex-1" />
        </View>
      </CustomModal>

      {/* Edit Project Modal */}
      <CustomModal visible={editModalVisible}>
        <Text className="text-xl font-bold mb-5 text-slate-900 dark:text-slate-50">Edit Project</Text>
        <ScrollView className="max-h-[65vh]" showsVerticalScrollIndicator={false}>
          <Input 
            label="Project Name" 
            placeholder="e.g. Downtown Highrise" 
            value={projectName} 
            onChangeText={setProjectName} 
          />
          <Input 
            label="Location (Optional)" 
            placeholder="e.g. 123 Main St, NY" 
            value={projectLocation} 
            onChangeText={setProjectLocation} 
          />
          <Input 
            label="Description (Optional)" 
            placeholder="e.g. Phase 1 foundation work" 
            value={projectDescription} 
            onChangeText={setProjectDescription} 
          />

          {renderClientPills()}
          {renderLaborerPills()}

        </ScrollView>
        <View className="flex-row mt-6 gap-3">
          <Button title="Cancel" variant="outline" onPress={() => setEditModalVisible(false)} className="flex-1" />
          <Button title="Save Changes" onPress={handleUpdateProject} loading={creating} className="flex-1" />
        </View>
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <CustomModal visible={deleteModalVisible}>
        <View className="items-center mb-4">
          <View className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mb-4">
            <Ionicons name="warning" size={32} color="#ef4444" />
          </View>
          <Text className="text-xl font-bold text-center text-slate-900 dark:text-slate-50">Delete Project?</Text>
          <Text className="text-base text-center mt-2 text-slate-500 dark:text-slate-400">
            Deleting <Text className="font-bold">{projectToDelete?.name}</Text> removes its timesheet records and laborer
            assignments for good. Payments and ledger invoices are kept — they just stop being tagged to this project.
            To keep everything, mark the project completed instead.
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
            onPress={confirmDeleteProject}
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
