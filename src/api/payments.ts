// File: src/api/payments.ts
import { supabase } from "../lib/supabase";
import { z } from "zod";

export const LogPaymentSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  laborer_id: z.string().uuid("Invalid laborer ID").optional(),
  vendor_id: z.string().uuid("Invalid vendor ID").optional(),
  amount: z.number().positive("Amount must be positive"),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  description: z.string().optional(),
  proof_url: z.string().url("Invalid proof URL").optional(),
}).refine((data) => {
  return (data.laborer_id !== undefined && data.vendor_id === undefined) ||
         (data.laborer_id === undefined && data.vendor_id !== undefined);
}, {
  message: "Payment must be assigned to exactly one laborer OR one vendor",
});

export const paymentsApi = {
  /**
   * Log a new payment (Contractor action)
   */
  async logPayment(data: {
    project_id: string;
    laborer_id?: string;
    vendor_id?: string;
    amount: number;
    payment_date: string;
    description?: string;
    proof_url?: string;
  }) {
    const parsed = LogPaymentSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    return await supabase.from("payments").insert(parsed.data).select().single();
  },

  /**
   * Fetch all payments for a specific project (Contractor action)
   */
  async getProjectPayments(projectId: string) {
    return await supabase
      .from("payments")
      .select(
        `
        *,
        laborer:users!payments_laborer_id_fkey (name, phone),
        vendor:vendors (name, phone)
      `,
      )
      .eq("project_id", projectId)
      .order("payment_date", { ascending: false });
  },

  /**
   * Fetch all payments received by a specific laborer (Laborer action)
   */
  async getLaborerPayments(laborerId: string) {
    return await supabase
      .from("payments")
      .select(
        `
        *,
        project:projects (name)
      `,
      )
      .eq("laborer_id", laborerId)
      .order("payment_date", { ascending: false });
  },

  /**
   * Upload a payment screenshot/proof to Supabase Storage
   * @param fileName e.g. "payment_123.jpg"
   * @param fileUri The local file URI (e.g. from expo-image-picker)
   * @param mimeType e.g. "image/jpeg"
   */
  async uploadPaymentProof(
    fileName: string,
    fileUri: string,
    mimeType: string = "image/jpeg",
  ) {
    // In React Native/Expo, we can use fetch() to turn a local file URI into a blob for uploading
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from("payment-proofs") // Make sure you created this bucket in Supabase!
      .upload(fileName, blob, {
        contentType: mimeType,
      });

    if (error) throw error;

    // Fetch and return the public URL so you can save it into the payments table
    const { data: publicUrlData } = supabase.storage
      .from("payment-proofs")
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  },
};
