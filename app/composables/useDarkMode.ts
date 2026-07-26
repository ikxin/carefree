export function useDarkMode() {
  const isDark = useState('dark-mode', () => false)

  const toggle = () => {
    isDark.value = !isDark.value

    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', isDark.value)
      localStorage.setItem('dark-mode', isDark.value ? '1' : '0')
    }
  }

  onMounted(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })

  return { isDark, toggle }
}
