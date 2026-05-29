<template>
  <a-layout style="height: 100vh">
    <a-layout-header style="background: #1a1a2e; padding: 0 24px; border-bottom: 1px solid #2a2a4a; display: flex; align-items: center">
      <h1 style="color: #7c7cff; font-size: 18px; margin: 0">
        Anime Extractor
        <span style="color: #888; font-size: 12px; margin-left: 8px">视频聚合源提取工具</span>
      </h1>
    </a-layout-header>
    <a-layout-content style="padding: 20px 24px; overflow-y: auto">
      <!-- Step 1 -->
      <div v-show="step === 1">
        <SourceSelector @select="onSourceSelect" />
        <a-button type="primary" :disabled="!selectedSource" style="margin-top: 16px" @click="step = 2">
          下一步 →
        </a-button>
      </div>

      <!-- Step 2 -->
      <div v-show="step === 2">
        <SearchPanel v-if="selectedSource" :source="selectedSource" @select="onSearchSelect" />
        <a-button style="margin-top: 16px" @click="step = 1">← 上一步</a-button>
      </div>

      <!-- Step 3 -->
      <div v-show="step === 3">
        <EpisodePanel
          v-if="selectedSource"
          ref="episodePanelRef"
          :source="selectedSource"
          @extract="onExtract"
        />
        <a-button style="margin-top: 16px" @click="step = 2">← 上一步</a-button>
      </div>

      <!-- Status -->
      <a-alert
        v-if="status"
        :message="status"
        type="info"
        style="margin-top: 16px"
        show-icon
      />

      <!-- Results -->
      <ResultCard :result="extractionResult" :error="extractionError" @play="onPlay" />

      <!-- 播放器弹窗 -->
      <VideoPlayer
        v-model:open="playerVisible"
        :url="playerUrl"
        :referer="playerReferer"
        :cookie="playerCookie"
        :episodes="playerEpisodes"
        :currentEpisodeIndex="playerEpisodeIndex"
        @update:episode="onPlayerEpisodeChange"
      />
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import SourceSelector from './components/SourceSelector.vue'
import SearchPanel from './components/SearchPanel.vue'
import EpisodePanel from './components/EpisodePanel.vue'
import ResultCard from './components/ResultCard.vue'
import VideoPlayer from './components/VideoPlayer.vue'
import type { Source, SearchResult, Episode, ExtractionResult, WizardStep } from './types'

const step = ref<WizardStep>(1)
const selectedSource = ref<Source | null>(null)
const status = ref('')
const extractionResult = ref<ExtractionResult | null>(null)
const extractionError = ref<string | null>(null)
const episodePanelRef = ref<InstanceType<typeof EpisodePanel> | null>(null)

// 播放器状态
const playerVisible = ref(false)
const playerUrl = ref('')
const playerReferer = ref('')
const playerCookie = ref('')
const playerEpisodes = ref<Episode[]>([])
const playerEpisodeIndex = ref(0)

let resultCleanup: (() => void) | null = null
let errorCleanup: (() => void) | null = null

const onSourceSelect = (source: Source) => {
  selectedSource.value = source
}

const onSearchSelect = (result: SearchResult) => {
  status.value = '解析剧集...'
  step.value = 3
  episodePanelRef.value?.loadEpisodes(result.url)
}

const onPlay = () => {
  if (!extractionResult.value) return
  playerUrl.value = extractionResult.value.url
  playerReferer.value = extractionResult.value.referer
  playerCookie.value = extractionResult.value.cookie
  playerEpisodes.value = episodePanelRef.value?.getCurrentEpisodes() || []
  playerEpisodeIndex.value = episodePanelRef.value?.getCurrentEpisodeIndex() || 0
  playerVisible.value = true
}

const onPlayerEpisodeChange = (index: number) => {
  playerEpisodeIndex.value = index
  const ep = playerEpisodes.value[index]
  if (!ep || !selectedSource.value) return

  status.value = '切换剧集...'
  const mv = selectedSource.value.searchConfig.matchVideo || {}
  const config = JSON.parse(JSON.stringify({
    url: ep.url,
    matchVideo: {
      enableNestedUrl: true,
      matchNestedUrl: mv.matchNestedUrl || '$^',
      matchVideoUrl: mv.matchVideoUrl || '',
      cookies: mv.cookies || '',
      addHeadersToVideo: mv.addHeadersToVideo || { referer: '' }
    }
  }))
  window.__extractor.startExtraction(config)
}

const onExtract = (episode: Episode) => {
  if (!selectedSource.value) return
  status.value = '提取中...'
  extractionResult.value = null
  extractionError.value = null

  const mv = selectedSource.value.searchConfig.matchVideo || {}
  // 深拷贝确保所有值可序列化（RegExp/函数等会被丢弃）
  const config = JSON.parse(JSON.stringify({
    url: episode.url,
    matchVideo: {
      enableNestedUrl: true,
      matchNestedUrl: mv.matchNestedUrl || '$^',
      matchVideoUrl: mv.matchVideoUrl || '',
      cookies: mv.cookies || '',
      addHeadersToVideo: mv.addHeadersToVideo || { referer: '' }
    }
  }))
  window.__extractor.startExtraction(config)
}

onMounted(() => {
  resultCleanup = window.__extractor.onResult((data: ExtractionResult) => {
    extractionResult.value = data
    status.value = `提取完成，耗时 ${data.duration_ms}ms`
    // 如果播放器打开中，更新播放 URL
    if (playerVisible.value) {
      playerUrl.value = data.url
      playerReferer.value = data.referer
      playerCookie.value = data.cookie
    }
  })
  errorCleanup = window.__extractor.onError((data: { error: string }) => {
    extractionError.value = data.error
    status.value = `提取失败: ${data.error}`
  })
})

onUnmounted(() => {
  resultCleanup?.()
  errorCleanup?.()
})
</script>
