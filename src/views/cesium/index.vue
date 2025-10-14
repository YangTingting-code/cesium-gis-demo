<template>
  <div class="map-wrapper">
    <!-- <test /> -->
    <cesiumMap ref="viewerRef" />
    <changeLayers
      class="layer-control"
      @change-layer="switchLayer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import cesiumMap from './CesiumViewer.vue';
import changeLayers from './loaders/changeLayers.vue';
// import test from './takeaway/index.vue'
//导入底图
import {
  img_tdt,
  img_cia,
  mapbox_navigation_night,
  mapbox_navigation_day,
  mapbox_streets,
  mapbox_outdoors,
  mapbox_light,
  mapbox_dark,
} from '../../data/layersData';
document.querySelector('.layer-control')?.addEventListener('click', () => {
  console.log('被点击了');
});
const viewerRef = ref<any>();

function switchLayer(type: string) {
  const viewer = viewerRef.value?.viewerRef;
  if (!viewer) return;
  const layers = viewer.scene.imageryLayers;
  layers.removeAll();
  if (type === 'mapbox_navigation_night') {
    layers.addImageryProvider(mapbox_navigation_night);
  } else if (type === 'mapbox_navigation_day') {
    layers.addImageryProvider(mapbox_navigation_day);
  } else if (type === 'mapbox_streets') {
    layers.addImageryProvider(mapbox_streets);
  } else if (type === 'mapbox_outdoors') {
    layers.addImageryProvider(mapbox_outdoors);
  } else if (type === 'mapbox_light') {
    layers.addImageryProvider(mapbox_light);
  } else if (type === 'mapbox_dark') {
    layers.addImageryProvider(mapbox_dark);
  } else if (type === 'tianditu') {
    layers.addImageryProvider(img_tdt);
    layers.addImageryProvider(img_cia);
  }
}
</script>

<style scoped lang="scss">
.map-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  .layer-control {
    position: absolute;
    right: .4375rem;
    top: .4375rem;
  }
}
</style>
