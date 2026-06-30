CREATE TYPE "content_status" AS ENUM ('draft', 'published', 'deleted');
CREATE TYPE "content_type" AS ENUM ('article', 'diary', 'moment');
CREATE TYPE "comment_status" AS ENUM ('pending', 'approved', 'spam', 'deleted');

CREATE TABLE "categories" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "parent_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contents" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "content_status" NOT NULL,
  "type" "content_type" NOT NULL,
  "description" TEXT,
  "content" TEXT NOT NULL,
  "author_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tags" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "settings" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "comments" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "content_id" UUID NOT NULL,
  "user_id" UUID,
  "parent_id" UUID,
  "name" TEXT,
  "email" TEXT,
  "url" TEXT,
  "content" TEXT NOT NULL,
  "status" "comment_status" NOT NULL,
  "ip_address" INET,
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_categories" (
  "content_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,

  CONSTRAINT "content_categories_pkey" PRIMARY KEY ("content_id", "category_id")
);

CREATE TABLE "content_tags" (
  "content_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,

  CONSTRAINT "content_tags_pkey" PRIMARY KEY ("content_id", "tag_id")
);

CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "contents_type_slug_key" ON "contents"("type", "slug");
CREATE INDEX "contents_author_id_idx" ON "contents"("author_id");
CREATE INDEX "contents_status_type_created_at_idx" ON "contents"("status", "type", "created_at");

CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

CREATE INDEX "comments_content_id_status_created_at_idx" ON "comments"("content_id", "status", "created_at");
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");

CREATE INDEX "content_categories_category_id_idx" ON "content_categories"("category_id");
CREATE INDEX "content_tags_tag_id_idx" ON "content_tags"("tag_id");

ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contents" ADD CONSTRAINT "contents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
