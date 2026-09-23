import { initializeBackupScheduler, stopBackupScheduler } from '#server/utils/backup'

export default defineNitroPlugin(async (nitroApp) => {
  if (import.meta.prerender) {
    return
  }

  await initializeBackupScheduler()
  nitroApp.hooks.hook('close', () => stopBackupScheduler())
})
