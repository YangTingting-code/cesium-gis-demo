<template>
  <toolbar />
  <div id="cesiumContainer" />
</template>

<script lang="ts" setup>
import { onMounted, ref, provide, computed, onUnmounted, inject,watch} from 'vue';
import * as Cesium from 'cesium';
import { createViewer } from './viewer';
//mapbox底图
import { mapbox_navigation_night } from '@/data/layersData';
//加载建筑
import { loadOSMBuildings } from './loaders/tileset';
import toolbar from './toolbar/index.vue'
const viewerRef = ref<Cesium.Viewer>();
const tilesetRef = ref<Cesium.Cesium3DTileset>();
// const isReady = ref(viewerRef.value && tilesetRef.value) //就绪状态
const isReady = computed(()=>!!viewerRef.value && !!tilesetRef.value) //就绪状态
// provide("viewerRef,tilesetRef",viewerRef,tilesetRef)

  const attrsViewer = inject('getViewer') as (viewer:Cesium.Viewer)=>void

  watch(()=>viewerRef.value,(newValue)=>{
    if(newValue)
      attrsViewer(newValue)
  })
  //注意一定要先inject再provide 因为provide会建立新的作用域 导致当前组件没法接收到父组件的函数
  provide('cesium',{
    viewerRef,
    tilesetRef,
    isReady
  })

onMounted(async () => {
  //创建viewer
  viewerRef.value = await createViewer('cesiumContainer');
  //添加mapbox底图
  //暂时注释掉 测试反向过滤
  // viewerRef.value.scene.imageryLayers.addImageryProvider(
  //   mapbox_navigation_night //不会存储上一次的样式 每次默认用这个夜间导航底图
  // );
  //加载osm 3dbuilding
  tilesetRef.value = await loadOSMBuildings(viewerRef.value)


 
})

onUnmounted(()=>{
  //刷新之后销毁
  viewerRef.value?.destroy()
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
