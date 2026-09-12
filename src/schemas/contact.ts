import { z } from "zod";

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
