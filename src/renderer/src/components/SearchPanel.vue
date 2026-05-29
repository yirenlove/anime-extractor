<template>
  <div>
    <h3 style="color: #7c7cff; margin-bottom: 12px">② 搜索番剧</h3>
    <a-input-search
      v-model:value="keyword"
      placeholder="输入关键词，例如 火影忍者"
      enter-button="搜索"
      :loading="loading"
      @search="onSearch"
    />
    <a-list
      :data-source="results"
      style="margin-top: 12px; max-height: 300px; overflow-y: auto"
      size="small"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <a-list-item-meta :title="item.name" />
          <template #actions>
            <a-button type="primary" size="small" @click="onSelect(item)">选择</a-button>
          </template>
        </a-list-item>
      </template>
      <template #empty>
        <div v-if="!loading" style="color: #888; text-align: center; padding: 20px">
          {{ searched ? '未找到相关结果' : '输入关键词开始搜索' }}
        </div>
      </template>
    </a-list>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Source, SearchResult } from '../types'

const props = defineProps<{
  source: Source
}>()

const emit = defineEmits<{
  (e: 'select', result: SearchResult): void
}>()

const keyword = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)
const searched = ref(false)

let cleanup: (() => void) | null = null

const onSearch = () => {
  if (!keyword.value.trim()) return
  loading.value = true
  searched.value = true
  window.__extractor.searchAnime(props.source.name, keyword.value)
}

const onSelect = (result: SearchResult) => {
  emit('select', result)
}

onMounted(() => {
  cleanup = window.__extractor.onSearchResults((data: SearchResult[]) => {
    results.value = data
    loading.value = false
  })
})

onUnmounted(() => {
  cleanup?.()
})
</script>
