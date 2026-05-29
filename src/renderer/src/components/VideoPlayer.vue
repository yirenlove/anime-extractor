<template>
  <a-modal
    :open="open"
    :width="900"
    :footer="null"
    :destroyOnClose="true"
    @update:open="(v: boolean) => $emit('update:open', v)"
  >
    <div ref="playerContainer" style="width: 100%; height: 500px; background: #000" />

    <!-- 剧集列表 -->
    <div v-if="episodes.length > 0" style="margin-top: 12px">
      <div style="font-size: 13px; color: #888; margin-bottom: 8px">
        当前：{{ episodes[currentEpisodeIndex]?.name || '未知' }}
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 120px; overflow-y: auto">
        <a-button
          v-for="(ep, i) in episodes"
          :key="ep.url"
          :type="i === currentEpisodeIndex ? 'primary' : 'default'"
          size="small"
          @click="onEpisodeChange(i)"
        >
          {{ ep.name }}
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import DPlayer from 'dplayer'
import Hls from 'hls.js'
import type { Episode } from '../types'

const props = defineProps<{
  open: boolean
  url: string
  referer: string
  cookie: string
  episodes: Episode[]
  currentEpisodeIndex: number
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:episode', index: number): void
}>()

const playerContainer = ref<HTMLElement | null>(null)
let dp: DPlayer | null = null

const getVideoType = (url: string): string => {
  if (url.includes('.m3u8') || url.includes('m3u8')) return 'hls'
  return 'normal'
}

const initPlayer = () => {
  if (!playerContainer.value || !props.url) return

  destroyPlayer()

  const videoType = getVideoType(props.url)

  const options: any = {
    container: playerContainer.value,
    video: {
      url: props.url,
      type: videoType
    }
  }

  if (videoType === 'hls') {
    options.video.customType = {
      hls: (video: HTMLVideoElement) => {
        const hls = new Hls()
        hls.loadSource(props.url)
        hls.attachMedia(video)
      }
    }
  }

  dp = new DPlayer(options)
}

const destroyPlayer = () => {
  if (dp) {
    dp.destroy()
    dp = null
  }
}

const onEpisodeChange = (index: number) => {
  emit('update:episode', index)
}

watch(() => props.open, async (val) => {
  if (val) {
    await nextTick()
    initPlayer()
  } else {
    destroyPlayer()
  }
})

watch(() => props.url, (newUrl) => {
  if (newUrl && dp && props.open) {
    const videoType = getVideoType(newUrl)
    dp.switchVideo({
      url: newUrl,
      type: videoType
    })
    if (videoType === 'hls') {
      const video = dp.video
      const hls = new Hls()
      hls.loadSource(newUrl)
      hls.attachMedia(video)
    }
  }
})

onBeforeUnmount(() => {
  destroyPlayer()
})
</script>
