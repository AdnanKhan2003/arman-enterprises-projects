import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export const ContactTypeSchema = z.enum(["client", "vendor"]);

export const CreateContactSchema = z.object({
  type: ContactTypeSchema.default("client"),
  name: z.string().trim().min(1, "Name is required"),
  address: z.string().trim().optional(),
  vendor_type: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9]{7,15})?$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
});

export const UpdateContactSchema = z.object({
  id: z.string().trim().min(1, "ID is required"),
  type: ContactTypeSchema.default("client"),
  name: z.string().trim().min(1, "Name is required"),
  address: z.string().trim().optional(),
  vendor_type: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9]{7,15})?$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
});

export const DeleteContactSchema = z.object({
  id: z.string().trim().min(1, "ID is required"),
  type: ContactTypeSchema,
});

export const contactsApi = {
  async createClient(data: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }) {
    const parsed = CreateContactSchema.safeParse({ ...data, type: "client" });
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch("/api/contacts", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    return json.data || json;
  },

  async createVendor(data: {
    name: string;
    address?: string;
    vendor_type?: string;
    phone?: string;
    email?: string;
  }) {
    const parsed = CreateContactSchema.safeParse({ ...data, type: "vendor" });
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch("/api/contacts", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    return json.data || json;
  },

  async getContractorContacts(contractorId: string) {
    const json = await apiFetch("/api/contacts");
    return (json.data || json) as { clients: any[]; vendors: any[] };
  },

  async getClients(contractorId: string) {
    const json = await apiFetch("/api/contacts");
    const data = json.data || json;
    return { data: data.clients };
  },

  async updateClient(data: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }) {
    const parsed = UpdateContactSchema.safeParse({ ...data, type: "client" });
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch("/api/contacts", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    return json.data || json;
  },

  async updateVendor(data: {
    id: string;
    name: string;
    address?: string;
    vendor_type?: string;
    phone?: string;
    email?: string;
  }) {
    const parsed = UpdateContactSchema.safeParse({ ...data, type: "vendor" });
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch("/api/contacts", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    return json.data || json;
  },

  async deleteClient(id: string) {
    const parsed = DeleteContactSchema.safeParse({ id, type: "client" });
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch(`/api/contacts?id=${parsed.data.id}&type=${parsed.data.type}`, {
      method: "DELETE",
    });
    return json.data || json;
  },

  async deleteVendor(id: string) {
    const parsed = DeleteContactSchema.safeParse({ id, type: "vendor" });
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch(`/api/contacts?id=${parsed.data.id}&type=${parsed.data.type}`, {
      method: "DELETE",
    });
    return json.data || json;
  },

  async deleteContact(id: string, type: "client" | "vendor") {
    const parsed = DeleteContactSchema.safeParse({ id, type });
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch(`/api/contacts?id=${parsed.data.id}&type=${parsed.data.type}`, {
      method: "DELETE",
    });
    return json.data || json;
  },
};
