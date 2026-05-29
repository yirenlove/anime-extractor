<template>
  <div>
    <h3 style="color: #7c7cff; margin-bottom: 12px">① 选择资源站</h3>
    <a-select
      v-model:value="selectedIdx"
      :options="sourceOptions"
      :placeholder="loading ? '加载中...' : '请选择视频源'"
      style="width: 100%"
      @change="onChange"
    />
    <div style="font-size: 12px; color: #888; margin-top: 8px">
      {{ selectedSource?.description || '暂无描述' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Source } from '../types'

const emit = defineEmits<{
  (e: 'select', source: Source): void
}>()

const sources = ref<Source[]>([])
const selectedIdx = ref<number | null>(null)
const selectedSource = ref<Source | null>(null)
const loading = ref(true)

const sourceOptions = computed(() =>
  sources.value.map((s, i) => ({ label: s.name, value: i }))
)

const onChange = (idx: number) => {
  selectedSource.value = sources.value[idx] || null
  if (selectedSource.value) emit('select', selectedSource.value)
}

onMounted(() => {
  window.__extractor.onSourcesList((data: Source[]) => {
    sources.value = data
    loading.value = false
  })
  window.__extractor.fetchSources()
})
</script>
