// File: src/api/contacts.ts
import { supabase } from "../lib/supabase";
import { z } from "zod";

export const CreateContactSchema = z.object({
  contractor_id: z.string().uuid("Invalid contractor ID"),
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

    return await supabase.from("clients").insert(parsed.data).select().single();
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

    return await supabase.from("vendors").insert(parsed.data).select().single();
  },

  /**
   * Fetch all clients and vendors managed by a specific contractor.
   * Very useful for dropdown menus when creating projects or logging payments!
   */
  async getContractorContacts(contractorId: string) {
    // 1. Fetch Clients
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("contractor_id", contractorId)
      .order("name");

    if (clientsError) throw clientsError;

    // 2. Fetch Vendors
    const { data: vendors, error: vendorsError } = await supabase
      .from("vendors")
      .select("*")
      .eq("contractor_id", contractorId)
      .order("name");

    if (vendorsError) throw vendorsError;

    return {
      clients,
      vendors,
    };
  },
};
