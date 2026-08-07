DROP TABLE IF EXISTS "payments";--> statement-breakpoint
CREATE TYPE "public"."payment_party_type" AS ENUM('contractor', 'laborer', 'client', 'vendor');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"from_type" "payment_party_type" NOT NULL,
	"from_id" text NOT NULL,
	"from_name" text NOT NULL,
	"to_type" "payment_party_type" NOT NULL,
	"to_id" text NOT NULL,
	"to_name" text NOT NULL,
	"project_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
