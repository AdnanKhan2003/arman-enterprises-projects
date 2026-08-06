import { z } from "zod";
import { apiFetch } from "../lib/auth-client";

export const CreateContactSchema = z.object({
  contractor_id: z.string().uuid("Invalid contractor ID").optional(),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  vendor_type: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
});

export const contactsApi = {
  /**
   * Create a new Client
   */
  async createClient(data: {
    contractor_id: string;
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
    contractor_id: string;
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
  }
};
