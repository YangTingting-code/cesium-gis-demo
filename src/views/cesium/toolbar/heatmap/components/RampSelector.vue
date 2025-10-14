<template>
  <li class="row ramp">
    <el-form-item
      label="色带"
      :label-position="itemLabelPosition"
    >
      <el-select
        v-model="pickedName"
        placeholder="选择色带"
        :size="size"
        @change="apply"
      >
        <el-option
          v-for="r in ramps"
          :key="r.name"
          :label="r.name"
          :value="r.name"
        >
          <div class="ramp-option">
            <span class="name">{{ r.name }}</span>
            <span
              class="ramp-bar"
              :style="{ background: gradientBar(r) }"
            />
          </div>
        </el-option>
      </el-select>
    </el-form-item>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { rampToGradient } from '../utils/rampToGradient'
import { ramps } from '../utils/colorRamps'

// 和父表单保持一致的 props
const props = defineProps<{ 
  size?: 'small' | 'default' | 'large',
  itemLabelPosition?: 'left' | 'right' | 'top'
}>()

const emit = defineEmits<{ apply: [gradient: Record<number, string>] }>()

const pickedName = ref(ramps[0].name)

function gradientBar(r: typeof ramps[0]) {
  const g = rampToGradient(r, 20)
  const stops = Object.keys(g)
    .map(pos => `${g[pos]} ${(+pos * 100).toFixed(1)}%`)
    .join(',')
  return `linear-gradient(to right, ${stops})`
}

function apply() {
  const ramp = ramps.find(r => r.name === pickedName.value)!
  emit('apply', rampToGradient(ramp, 10))
}
</script>

<style scoped>
.ramp-option {
  display: flex;
  align-items: center;
}
.ramp-option .name {
  width: 80px;
  font-size: 0.85rem;
  color: #b2ebf2;
}
.ramp-bar {
  flex: 1;
  height: 18px;
  border: 1px solid rgba(0,255,255,0.3);
  border-radius: 4px;
  margin-left: 8px;
}
</style>
