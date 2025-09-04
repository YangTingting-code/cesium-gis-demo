<template>
  <!-- 工具栏 -->
  <!-- <toolBar
    v-if="viewerRef && tilesetRef"
    :viewer-ref="viewerRef"
    :tileset-ref="tilesetRef"
  /> -->
  <!-- 空间查询的组件 -->
  <!-- 父传给子 -->
  <!-- <searchTest
    v-if="viewer" 
    :viewer="viewer"
  /> -->
  <div id="cesiumContainer" />
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import * as Cesium from 'cesium';
import { createViewer } from './viewer';
//mapbox底图
import { mapbox_navigation_night } from '@/data/layersData';
//加载建筑
import { loadOSMBuildings } from './loaders/tileset';
//工具栏
import toolBar from './interactions/spatialSearch/index.vue';

const viewerRef = ref<Cesium.Viewer>();
const tilesetRef = ref();
const props = defineProps(['getViewerAndTile'])

onMounted(async () => {
  //创建viewer
  viewerRef.value = await createViewer('cesiumContainer');
  //添加mapbox底图
  viewerRef.value.scene.imageryLayers.addImageryProvider(
    mapbox_navigation_night
  );
  //加载osm 3dbuilding
  tilesetRef.value = await loadOSMBuildings(viewerRef.value)

  //把viewer 和 tilesetRef给父
props.getViewerAndTile(viewerRef.value,tilesetRef.value)
})

//暴露viewer给index.vue做底图切换逻辑
defineExpose({ viewerRef });
</script>

<style>
#cesiumContainer {
  width: 100%;
  height: 100%;
}
</style>
