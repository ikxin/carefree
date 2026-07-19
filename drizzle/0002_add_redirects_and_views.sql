CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"destination" text NOT NULL,
	"type" text DEFAULT 'exact' NOT NULL,
	"code" integer DEFAULT 301 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) NOT NULL,
	CONSTRAINT "redirects_type_check" CHECK ("redirects"."type" IN ('exact', 'regex')),
	CONSTRAINT "redirects_code_check" CHECK ("redirects"."code" IN (301, 302, 307, 308))
);
--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "views" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_source_type_key" ON "redirects" USING btree ("source","type");--> statement-breakpoint
CREATE INDEX "redirects_enabled_type_priority_idx" ON "redirects" USING btree ("enabled","type","priority");
