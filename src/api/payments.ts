// File: src/api/payments.ts
import { z } from "zod";
import { supabase } from "../lib/supabase";

export const LogPaymentSchema = z
  .object({
    project_id: z.string().uuid("Invalid project ID"),
    laborer_id: z.string().uuid("Invalid laborer ID").optional(),
    vendor_id: z.string().uuid("Invalid vendor ID").optional(),
    amount: z.number().positive("Amount must be positive"),
    payment_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    description: z.string().optional(),
    proof_url: z.string().url("Invalid proof URL").optional(),
  })
  .refine(
    (data) => {
      return (
        (data.laborer_id !== undefined && data.vendor_id === undefined) ||
        (data.laborer_id === undefined && data.vendor_id !== undefined)
      );
    },
    {
      message: "Payment must be assigned to exactly one laborer OR one vendor",
    },
  );

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
    try {
      const parsed = LogPaymentSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parsed.data.project_id,
          laborerId: parsed.data.laborer_id,
          vendorId: parsed.data.vendor_id,
          amount: parsed.data.amount,
          paymentDate: parsed.data.payment_date,
          description: parsed.data.description,
          proofUrl: parsed.data.proof_url,
        }),
      });

      if (!response.ok) throw new Error("Failed to log payment");
      const result = await response.json();
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Fetch all payments for a specific project (Contractor action)
   */
  async getProjectPayments(projectId: string) {
    try {
      const response = await fetch(`/api/payments?projectId=${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project payments");
      const result = await response.json();
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Fetch all payments received by a specific laborer (Laborer action)
   */
  async getLaborerPayments(laborerId: string) {
    try {
      const response = await fetch("/api/payments");
      if (!response.ok) throw new Error("Failed to fetch laborer payments");
      const result = await response.json();
      return { data: result.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
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
