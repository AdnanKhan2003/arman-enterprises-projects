import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export const CreateContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  vendor_type: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
});

export const UpdateContactSchema = CreateContactSchema.extend({
  id: z.string().min(1, "ID is required"),
});

export const DeleteContactSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const contactsApi = {
  async createClient(data: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }) {
    const parsed = CreateContactSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ type: 'client', ...parsed.data }),
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
    const parsed = CreateContactSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ type: 'vendor', ...parsed.data }),
    });

    return json.data || json;
  },

  async getContractorContacts(contractorId: string) {
    const json = await apiFetch('/api/contacts');
    return (json.data || json) as { clients: any[]; vendors: any[] };
  },

  async getClients(contractorId: string) {
    const json = await apiFetch('/api/contacts');
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
    const parsed = UpdateContactSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch('/api/contacts', {
      method: 'PATCH',
      body: JSON.stringify({ type: 'client', ...parsed.data }),
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
    const parsed = UpdateContactSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch('/api/contacts', {
      method: 'PATCH',
      body: JSON.stringify({ type: 'vendor', ...parsed.data }),
    });
    return json.data || json;
  },

  async deleteClient(id: string) {
    const json = await apiFetch(`/api/contacts?id=${id}&type=client`, {
      method: 'DELETE',
    });
    return json.data || json;
  },

  async deleteVendor(id: string) {
    const json = await apiFetch(`/api/contacts?id=${id}&type=vendor`, {
      method: 'DELETE',
    });
    return json.data || json;
  },

  async deleteContact(id: string, type: 'client' | 'vendor') {
    const json = await apiFetch(`/api/contacts?id=${id}&type=${type}`, {
      method: 'DELETE',
    });
    return json.data || json;
  },
};
