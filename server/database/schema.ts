import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const timestamps = () => ({
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
})

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    ...timestamps(),
  },
  (table) => [uniqueIndex('users_email_key').on(table.email)],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date', precision: 3 }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('sessions_token_key').on(table.token),
    index('sessions_user_id_idx').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'sessions_user_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      mode: 'date',
      precision: 3,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      mode: 'date',
      precision: 3,
    }),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    ...timestamps(),
  },
  (table) => [
    index('accounts_user_id_idx').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'accounts_user_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const verifications = pgTable(
  'verifications',
  {
    id: uuid('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date', precision: 3 }).notNull(),
    ...timestamps(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
)

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    parentId: uuid('parent_id'),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('categories_slug_key').on(table.slug),
    index('categories_parent_id_idx').on(table.parentId),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'categories_parent_id_fkey',
    })
      .onDelete('set null')
      .onUpdate('cascade'),
  ],
)

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    ...timestamps(),
  },
  (table) => [uniqueIndex('tags_slug_key').on(table.slug)],
)

export const contents = pgTable(
  'contents',
  {
    id: uuid('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    type: text('type').notNull(),
    description: text('description'),
    content: text('content').notNull(),
    authorId: uuid('author_id').notNull(),
    status: text('status').default('draft').notNull(),
    ...timestamps(),
    views: integer('views').default(0).notNull(),
  },
  (table) => [
    uniqueIndex('contents_slug_key').on(table.slug),
    index('contents_author_id_idx').on(table.authorId),
    index('contents_type_status_created_at_idx').on(table.type, table.status, table.createdAt),
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [users.id],
      name: 'contents_author_id_fkey',
    })
      .onDelete('restrict')
      .onUpdate('cascade'),
  ],
)

export const redirects = pgTable(
  'redirects',
  {
    id: uuid('id').primaryKey(),
    source: text('source').notNull(),
    destination: text('destination').notNull(),
    type: text('type', { enum: ['exact', 'regex'] })
      .default('exact')
      .notNull(),
    code: integer('code').default(301).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    priority: integer('priority').default(0).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('redirects_source_type_key').on(table.source, table.type),
    index('redirects_enabled_type_priority_idx').on(table.enabled, table.type, table.priority),
    check('redirects_type_check', sql`${table.type} IN ('exact', 'regex')`),
    check('redirects_code_check', sql`${table.code} IN (301, 302, 307, 308)`),
  ],
)

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey(),
    contentId: uuid('content_id').notNull(),
    userId: uuid('user_id'),
    parentId: uuid('parent_id'),
    name: text('name'),
    email: text('email'),
    url: text('url'),
    content: text('content').notNull(),
    status: text('status').default('pending').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    ...timestamps(),
  },
  (table) => [
    index('comments_content_id_status_created_at_idx').on(
      table.contentId,
      table.status,
      table.createdAt,
    ),
    index('comments_user_id_idx').on(table.userId),
    index('comments_parent_id_idx').on(table.parentId),
    foreignKey({
      columns: [table.contentId],
      foreignColumns: [contents.id],
      name: 'comments_content_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'comments_user_id_fkey',
    })
      .onDelete('set null')
      .onUpdate('cascade'),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'comments_parent_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const contentCategories = pgTable(
  'content_categories',
  {
    contentId: uuid('content_id').notNull(),
    categoryId: uuid('category_id').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.contentId, table.categoryId],
      name: 'content_categories_pkey',
    }),
    index('content_categories_category_id_idx').on(table.categoryId),
    foreignKey({
      columns: [table.contentId],
      foreignColumns: [contents.id],
      name: 'content_categories_content_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'content_categories_category_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const contentTags = pgTable(
  'content_tags',
  {
    contentId: uuid('content_id').notNull(),
    tagId: uuid('tag_id').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.contentId, table.tagId],
      name: 'content_tags_pkey',
    }),
    index('content_tags_tag_id_idx').on(table.tagId),
    foreignKey({
      columns: [table.contentId],
      foreignColumns: [contents.id],
      name: 'content_tags_content_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      columns: [table.tagId],
      foreignColumns: [tags.id],
      name: 'content_tags_tag_id_fkey',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  contents: many(contents),
  comments: many(comments),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryChildren',
  }),
  children: many(categories, {
    relationName: 'categoryChildren',
  }),
  contentCategories: many(contentCategories),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  contentTags: many(contentTags),
}))

export const contentsRelations = relations(contents, ({ many, one }) => ({
  author: one(users, {
    fields: [contents.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  contentCategories: many(contentCategories),
  contentTags: many(contentTags),
}))

export const commentsRelations = relations(comments, ({ many, one }) => ({
  content: one(contents, {
    fields: [comments.contentId],
    references: [contents.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'commentReplies',
  }),
  replies: many(comments, {
    relationName: 'commentReplies',
  }),
}))

export const contentCategoriesRelations = relations(contentCategories, ({ one }) => ({
  content: one(contents, {
    fields: [contentCategories.contentId],
    references: [contents.id],
  }),
  category: one(categories, {
    fields: [contentCategories.categoryId],
    references: [categories.id],
  }),
}))

export const contentTagsRelations = relations(contentTags, ({ one }) => ({
  content: one(contents, {
    fields: [contentTags.contentId],
    references: [contents.id],
  }),
  tag: one(tags, {
    fields: [contentTags.tagId],
    references: [tags.id],
  }),
}))
