import { initializeBackupScheduler, stopBackupScheduler } from '#server/utils/backup'

export default defineNitroPlugin(async (nitroApp) => {
  await initializeBackupScheduler()
  nitroApp.hooks.hook('close', () => stopBackupScheduler())
})
