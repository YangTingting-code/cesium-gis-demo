<template>
  <li class="row region">
    <el-form-item
      label="行政区"
      :label-position="itemLabelPosition"
    >
      <el-select
        v-model="pickedRegion"
        placeholder="选择行政区"
        multiple
        :size="size"
        @change="chooseRegion"
      >
        <el-option
          v-for="region in regions"
          :key="region"
          :label="region"
          :value="region"
        >
          <div class="region-option">
            <span class="region">{{ region }}</span>
          </div>
        </el-option>
      </el-select>
    </el-form-item>
  </li>
</template>

<script setup lang="ts">
import {ref,toRaw} from 'vue'
import {regions} from '@/data/regionHK'
  // 和父表单保持一致的 props
  const props = defineProps<{ 
    size?: 'small' | 'default' | 'large',
    itemLabelPosition?: 'left' | 'right' | 'top'
  }>()
  const pickedRegion = ref(regions[0])
  const emit = defineEmits(["chooseRegion"])
  function chooseRegion(){
    // console.log('toRaw(pickedRegion)',toRaw(pickedRegion.value))
    emit('chooseRegion',toRaw(pickedRegion.value))
  }
</script>

<style lang="scss">
.ramp-option {
  display: flex;
  align-items: center;
  .name {
    width: 80px;
    font-size: 0.85rem;
    color: #b2ebf2;
  }
}
</style>