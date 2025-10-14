<template>
  <div class="topChart">
    <chart />
  </div>
  <div class="bottomChart">
    <heatmapChart />
  </div>
</template>

<script setup lang="ts">
  import chart from "./topChart/HeatFlowCompare.vue";
  import heatmapChart from "./bottomChart/index.vue";
</script>

<style lang="scss">
.topChart,
.bottomChart{
  position: relative;
  top: 2%;
  left: 4%;
  height: 45vh;
  width: 92%;
  border-radius: 10px;
}
.bottomChart{
  margin-top: 5px;
  height: 38vh;
}


</style>