// File: src/api/contacts.ts
import { z } from "zod";

export const CreateContactSchema = z.object({
  contractor_id: z.string().uuid("Invalid contractor ID").optional(),
  name: z.string().min(1, "Name is required"),
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
    phone?: string;
    email?: string;
  }) {
    const parsed = CreateContactSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'client', ...parsed.data }),
    });

    if (!response.ok) throw new Error("Failed to create client");
    return await response.json();
  },

  /**
   * Create a new Vendor
   */
  async createVendor(data: {
    contractor_id: string;
    name: string;
    phone?: string;
    email?: string;
  }) {
    const parsed = CreateContactSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'vendor', ...parsed.data }),
    });

    if (!response.ok) throw new Error("Failed to create vendor");
    return await response.json();
  },

  /**
   * Fetch all clients and vendors managed by a specific contractor.
   */
  async getContractorContacts(contractorId: string) {
    const response = await fetch('/api/contacts');
    
    if (!response.ok) throw new Error("Failed to fetch contacts");
    
    return await response.json();
  }
};
