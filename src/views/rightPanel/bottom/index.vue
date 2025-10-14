<template>
  <div class="map-wrapper">
    <div id="mapbox-container"></div>
  </div>
</template>

<script lang="ts" setup>
import mapboxgl from 'mapbox-gl'
import { onMounted } from 'vue'
import {getCurrentCombinedData} from './utils/pathData'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

//注意要写在 onMounted 中, 不然容器还没有挂载
onMounted(async ()=>{
  const mapboxPath = new mapboxgl.Map({
  container:'mapbox-container',
  center:[113,22],
  zoom:9,
  style: 'mapbox://styles/mapbox/light-v11',
})
 // 可选：监听加载完成事件
  mapboxPath.on('load', () => {
    console.log('Mapbox 初始化完成')

  })
  //加载一条轨迹线
await getCurrentCombinedData()
   
})


</script>

<style lang="scss" scoped>


.map-wrapper {
  display: flex;
  justify-content:center; /* 或 center / flex-start */
  align-items: center;
  height: 100%;
  width: 100%;
  border-radius: 10px;
  padding: 0.5rem;
}

#mapbox-container {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden; //圆角 裁剪内部canvas到圆角边界
  border: 2px solid rgb(6, 224, 248); //地图容器描边
}
</style>