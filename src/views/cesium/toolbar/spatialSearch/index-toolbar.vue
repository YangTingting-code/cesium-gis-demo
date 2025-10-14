<template>
  <el-row>
    <el-col
      :span="6"
      class="search-control ml-3"
    >
      <search />
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import search from './index.vue'
</script>

<style lang="scss">
/* 保留你原来的样式 */
.el-row {
  position: absolute;
  width: 50%;
  z-index: 10;
  margin-bottom: 20px;
}

.el-row:last-child {
  margin-bottom: 0;
}

.el-col {
  border-radius: 4px;
  margin-right: 15px;
  margin-top: 7px;
}
</style>
