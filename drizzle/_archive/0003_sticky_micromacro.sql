CREATE TYPE "public"."ledger_invoice_format" AS ENUM('pdf', 'excel');--> statement-breakpoint
CREATE TYPE "public"."ledger_invoice_scope" AS ENUM('Income', 'Expense', 'Both');--> statement-breakpoint
CREATE TABLE "ledger_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" text NOT NULL,
	"title" text,
	"scope" "ledger_invoice_scope" NOT NULL,
	"format" "ledger_invoice_format" NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger_invoices" ADD CONSTRAINT "ledger_invoices_contractor_id_user_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;