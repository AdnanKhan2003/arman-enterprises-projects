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
  /**
   * Create a new Client
   */
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

    return json;
  },

  /**
   * Create a new Vendor
   */
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

    return json;
  },

  /**
   * Fetch all clients and vendors managed by a specific contractor.
   */
  async getContractorContacts(contractorId: string) {
    const json = await apiFetch('/api/contacts');
    return json as { clients: any[], vendors: any[] };
  },

  /**
   * Update an existing Client
   */
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
    return json;
  },

  /**
   * Update an existing Vendor
   */
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
    return json;
  },

  /**
   * Delete a Client
   */
  async deleteClient(id: string) {
    const parsed = DeleteContactSchema.safeParse({ id });
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch(`/api/contacts?id=${id}&type=client`, {
      method: 'DELETE',
    });
    return json;
  },

  /**
   * Delete a Vendor
   */
  async deleteVendor(id: string) {
    const parsed = DeleteContactSchema.safeParse({ id });
    if (!parsed.success) throw parsed.error;

    const json = await apiFetch(`/api/contacts?id=${id}&type=vendor`, {
      method: 'DELETE',
    });
    return json;
  }
};
