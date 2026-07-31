export const useLightbox = () => {
  const images = useState<string[]>('lightbox:images', () => [])
  const currentIndex = useState<number>('lightbox:index', () => 0)
  const visible = useState<boolean>('lightbox:visible', () => false)

  const currentSrc = computed(() => images.value[currentIndex.value] ?? '')

  function open(list: string[], index: number) {
    images.value = list
    currentIndex.value = index
    visible.value = true
  }

  function close() {
    visible.value = false
  }

  function reset() {
    visible.value = false
    images.value = []
    currentIndex.value = 0
  }

  function next() {
    const imageCount = images.value.length
    if (imageCount > 1) {
      currentIndex.value = (currentIndex.value + 1) % imageCount
    }
  }

  function prev() {
    const imageCount = images.value.length
    if (imageCount > 1) {
      currentIndex.value = (currentIndex.value - 1 + imageCount) % imageCount
    }
  }

  return { images, currentIndex, currentSrc, visible, open, close, reset, next, prev }
}
