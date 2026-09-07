CREATE UNIQUE INDEX "accounts_provider_id_account_id_key" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
DROP INDEX "accounts_issuer_account_id_key";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "issuer";
