import type { AdminOpenAiSettings } from '#shared/types/admin'
import { settings } from '#server/database/schema'
import { db } from '#server/utils/db'
import { inArray, sql } from 'drizzle-orm'

export const openAiSettingKeys = {
  apiKey: 'ai.openai.api_key',
  baseUrl: 'ai.openai.base_url',
  model: 'ai.openai.model',
} as const

export interface StoredOpenAiSettings {
  apiKey: string | null
  baseUrl: string | null
  model: string | null
  updatedAt: Date | null
}

export async function getOpenAiSettings(): Promise<StoredOpenAiSettings> {
  const rows = await db
    .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt })
    .from(settings)
    .where(inArray(settings.key, Object.values(openAiSettingKeys)))

  const values = new Map(rows.map((row) => [row.key, row]))
  const updatedAt = rows.reduce<Date | null>(
    (latest, row) => (!latest || row.updatedAt > latest ? row.updatedAt : latest),
    null,
  )

  return {
    apiKey: values.get(openAiSettingKeys.apiKey)?.value ?? null,
    baseUrl: values.get(openAiSettingKeys.baseUrl)?.value ?? null,
    model: values.get(openAiSettingKeys.model)?.value ?? null,
    updatedAt,
  }
}

export function serializeAdminOpenAiSettings(stored: StoredOpenAiSettings): AdminOpenAiSettings {
  return {
    apiKey: stored.apiKey ?? '',
    baseUrl: stored.baseUrl ?? '',
    model: stored.model ?? '',
    updatedAt: stored.updatedAt?.toISOString() ?? null,
  }
}

export async function saveOpenAiSettings(values: {
  apiKey: string
  baseUrl: string
  model: string
}) {
  await db
    .insert(settings)
    .values([
      { key: openAiSettingKeys.apiKey, value: values.apiKey },
      { key: openAiSettingKeys.baseUrl, value: values.baseUrl },
      { key: openAiSettingKeys.model, value: values.model },
    ])
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: sql`excluded.value`,
        updatedAt: new Date(),
      },
    })
}
