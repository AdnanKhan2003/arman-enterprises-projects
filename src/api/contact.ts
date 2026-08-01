// File: src/api/contacts.ts
import { supabase } from "../lib/supabase";

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
    return await supabase.from("clients").insert(data).select().single();
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
    return await supabase.from("vendors").insert(data).select().single();
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
