import React, { useState } from "react";
import { View, ScrollView, RefreshControl, useColorScheme, Pressable } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { Card } from "../../components/ui/Card";
import { CustomModal } from "../../components/ui/CustomModal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { authClient } from "../../lib/auth-client";
import { apiClient } from "../../lib/http-client";
import { CreateProjectSchema, UpdateProjectSchema, DeleteProjectSchema } from "../../schemas";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

export default function ProjectsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedLaborerIds, setSelectedLaborerIds] = useState<string[]>([]);

  const { data: projects = [], isRefetching: isRefetchingProjects, refetch: refetchProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res: any = await apiClient.get("/api/projects");
      return res.data || [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const res: any = await apiClient.get("/api/contacts");
      return res.clients || [];
    },
    enabled: !!session?.user?.id,
  });
  const clients = contactsData || [];

  const { data: laborersData } = useQuery({
    queryKey: ["laborers"],
    queryFn: async () => {
      const res: any = await apiClient.get("/api/contractors/laborers");
      return res.laborers || [];
    },
    enabled: !!session?.user?.id,
  });
  const laborers = laborersData || [];

  const { data: attendanceData } = useQuery({
    queryKey: ["attendance"],
    queryFn: async () => {
      const res: any = await apiClient.get("/api/attendance");
      return res.data?.items || res.data || [];
    },
    enabled: !!session?.user?.id,
  });

  const pendingByProject: Record<string, number> = {};
  if (Array.isArray(attendanceData)) {
    for (const rec of attendanceData) {
      if (rec.projectId) {
        pendingByProject[rec.projectId] = (pendingByProject[rec.projectId] || 0) + 1;
      }
    }
  }

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const parsed = CreateProjectSchema.parse(payload);
      return apiClient.post("/api/projects", parsed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Project created successfully",
      });
      setModalVisible(false);
      setProjectName("");
      setProjectLocation("");
      setProjectDescription("");
      setSelectedClientId(null);
      setSelectedLaborerIds([]);
    },
    onError: (e: any) => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: e.message || "Failed to create project",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const parsed = UpdateProjectSchema.parse(payload);
      return apiClient.patch("/api/projects", parsed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Project updated successfully",
      });
      setEditModalVisible(false);
      setProjectName("");
      setProjectLocation("");
      setProjectDescription("");
      setEditingProjectId(null);
      setSelectedClientId(null);
      setSelectedLaborerIds([]);
    },
    onError: (e: any) => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: e.message || "Failed to update project",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "completed" }) => {
      const parsed = UpdateProjectSchema.parse({ id, status });
      return apiClient.patch("/api/projects", parsed);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      Toast.show({
        type: "success",
        text1: vars.status === "completed" ? "Marked completed" : "Project reopened",
      });
    },
    onError: () => {
      Toast.show({ type: "error", text1: "Could not update project" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const parsed = DeleteProjectSchema.parse({ id });
      return apiClient.delete(`/api/projects?id=${parsed.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Project deleted successfully",
      });
      setDeleteModalVisible(false);
      setProjectToDelete(null);
    },
    onError: (e: any) => {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: e.message || "Failed to delete project",
      });
    },
  });

  const onRefresh = async () => {
    await Promise.all([
      refetchProjects(),
      queryClient.invalidateQueries({ queryKey: ["attendance"] }),
    ]);
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

  const handleCreateProject = () => {
    if (!projectName.trim() || !session?.user?.id) return;
    createMutation.mutate({
      name: projectName,
      location: projectLocation,
      description: projectDescription,
      client_id: selectedClientId || undefined,
      laborer_ids: selectedLaborerIds,
    });
  };

  const handleUpdateProject = () => {
    if (!projectName.trim() || !editingProjectId) return;
    updateMutation.mutate({
      id: editingProjectId,
      name: projectName,
      location: projectLocation,
      description: projectDescription,
      client_id: selectedClientId || undefined,
      laborer_ids: selectedLaborerIds,
    });
  };

  const toggleStatus = (project: any) => {
    const next = project.status === "completed" ? "active" : "completed";
    toggleStatusMutation.mutate({ id: project.id, status: next });
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    deleteMutation.mutate(projectToDelete.id);
  };

  const renderClientPills = () => (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Assign Client (Optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {clients.map((client: any) => {
          const isSelected = selectedClientId === client.id;
          return (
            <Pressable 
              key={client.id}
              onPress={() => setSelectedClientId(isSelected ? null : client.id)}
              className={`px-4 py-2 rounded-full mr-2 border ${isSelected ? "bg-blue-100 border-blue-500 dark:bg-blue-900/50" : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700"}`}
            >
              <Text className={`${isSelected ? "text-blue-700 dark:text-blue-300 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
                {client.name}
              </Text>
            </Pressable>
          );
        })}
        {clients.length === 0 && <Text className="text-slate-500 italic">No clients available</Text>}
      </ScrollView>
    </View>
  );

  const renderLaborerPills = () => (
    <View className="mb-2">
      <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Assign Laborers (Optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {laborers.map((laborer: any) => {
          const isSelected = selectedLaborerIds.includes(laborer.id);
          return (
            <Pressable 
              key={laborer.id}
              onPress={() => toggleLaborer(laborer.id)}
              className={`px-4 py-2 rounded-full mr-2 border ${isSelected ? "bg-indigo-100 border-indigo-500 dark:bg-indigo-900/50" : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700"}`}
            >
              <Text className={`${isSelected ? "text-indigo-700 dark:text-indigo-300 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
                {laborer.name}
              </Text>
            </Pressable>
          );
        })}
        {laborers.length === 0 && <Text className="text-slate-500 italic">No laborers available</Text>}
      </ScrollView>
    </View>
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

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
        refreshControl={<RefreshControl refreshing={isRefetchingProjects} onRefresh={onRefresh} tintColor={isDark ? "#F8FAFC" : "#0F172A"} />}
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
            .filter((p: any) => statusFilter === "all" || p.status !== "completed")
            .sort((a: any, b: any) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0))
            .map((p: any) => (
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
                        {p.laborerIds.length} {p.laborerIds.length === 1 ? "Laborer" : "Laborers"} Assigned
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
          <Button title="Create" onPress={handleCreateProject} loading={createMutation.isPending} className="flex-1" />
        </View>
      </CustomModal>

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
          <Button title="Save Changes" onPress={handleUpdateProject} loading={updateMutation.isPending} className="flex-1" />
        </View>
      </CustomModal>

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
            disabled={deleteMutation.isPending}
          />
          <Pressable 
            className={`flex-1 py-3.5 px-6 rounded-lg items-center justify-center bg-red-500 active:bg-red-600 ${deleteMutation.isPending ? "opacity-60" : ""}`}
            onPress={confirmDeleteProject}
            disabled={deleteMutation.isPending}
          >
            <Text className="text-[15px] font-semibold text-white">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Text>
          </Pressable>
        </View>
      </CustomModal>
    </Screen>
  );
}
