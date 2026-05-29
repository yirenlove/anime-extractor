<template>
  <div>
    <h3 style="color: #7c7cff; margin-bottom: 12px">③ 选择线路和集数</h3>
    <a-tabs v-model:activeKey="activeChannel" size="small">
      <a-tab-pane v-for="(ch, i) in channels" :key="i" :tab="`${ch.name} (${ch.episodes.length})`">
        <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 240px; overflow-y: auto">
          <a-button
            v-for="ep in sortedEpisodes(ch.episodes)"
            :key="ep.url"
            :type="selectedEpisode?.url === ep.url ? 'primary' : 'default'"
            size="small"
            @click="onSelectEp(ep)"
          >
            {{ ep.name }}
          </a-button>
        </div>
      </a-tab-pane>
    </a-tabs>
    <div style="font-size: 12px; color: #888; margin-top: 8px; min-height: 18px">
      {{ selectedEpisode ? `选中: ${selectedEpisode.name}` : '' }}
    </div>
    <a-button
      type="primary"
      :disabled="!selectedEpisode"
      style="margin-top: 12px"
      @click="onExtract"
    >
      提取
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Source, Channel, Episode } from '../types'

const props = defineProps<{
  source: Source
}>()

const emit = defineEmits<{
  (e: 'extract', episode: Episode): void
}>()

const channels = ref<Channel[]>([])
const activeChannel = ref(0)
const selectedEpisode = ref<Episode | null>(null)

let cleanup: (() => void) | null = null

const sortedEpisodes = (eps: Episode[]) =>
  [...eps].sort((a, b) => a.sort - b.sort)

const onSelectEp = (ep: Episode) => {
  selectedEpisode.value = ep
}

const onExtract = () => {
  if (selectedEpisode.value) emit('extract', selectedEpisode.value)
}

const loadEpisodes = (subjectUrl: string) => {
  window.__extractor.parseEpisodes(props.source.name, subjectUrl)
}

onMounted(() => {
  cleanup = window.__extractor.onEpisodesData((data: { channels: Channel[] }) => {
    channels.value = data.channels || []
    activeChannel.value = 0
    selectedEpisode.value = null
  })
})

onUnmounted(() => {
  cleanup?.()
})

defineExpose({ loadEpisodes })
</script>
