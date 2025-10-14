<template>
  <div class="top-panel">
    <combinedOrder />
  </div>
  <div class="bottom-panel">
    <pathMap />
  </div>
</template>

<script setup lang="ts">
import combinedOrder from './top/index.vue'
import pathMap  from './bottom/index.vue'
</script>

<style lang="scss" scoped>
.top-panel,
.bottom-panel{
  position: relative;
  top: 2%;
  left: 4%;
  height: 45vh;
  width: 92%;
  border-radius: 10px;
  border: 1px solid rgb(19, 244, 237);
}
.bottom-panel{
  margin-top: 5px;
  height: 38vh;
}

</style>
