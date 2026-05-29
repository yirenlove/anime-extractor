<template>
  <a-card v-if="result" size="small" style="margin-top: 12px">
    <a-descriptions :column="1" size="small" bordered>
      <a-descriptions-item label="URL">
        <span style="color: #7cff7c; word-break: break-all; font-family: monospace; font-size: 12px">
          {{ result.url }}
        </span>
      </a-descriptions-item>
      <a-descriptions-item label="Referer">{{ result.referer }}</a-descriptions-item>
      <a-descriptions-item label="Cookie">{{ result.cookie }}</a-descriptions-item>
      <a-descriptions-item label="耗时">{{ result.duration_ms }}ms</a-descriptions-item>
    </a-descriptions>
    <a-space style="margin-top: 8px">
      <a-button size="small" @click="copyText(result.url)">复制 URL</a-button>
      <a-button size="small" @click="copyAll">复制全部</a-button>
    </a-space>
  </a-card>
  <a-alert
    v-else-if="error"
    type="error"
    :message="error"
    style="margin-top: 12px"
    show-icon
  />
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import type { ExtractionResult } from '../types'

const props = defineProps<{
  result: ExtractionResult | null
  error: string | null
}>()

const copyText = (text: string) => {
  navigator.clipboard.writeText(text).then(() => message.success('已复制'))
}

const copyAll = () => {
  if (props.result) {
    navigator.clipboard.writeText(JSON.stringify(props.result, null, 2)).then(() => message.success('已复制'))
  }
}
</script>
