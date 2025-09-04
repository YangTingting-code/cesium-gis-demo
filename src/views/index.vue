<template>
  <div
    id="index"
    ref="appRef"
  >
    <div class="bg">
      <dv-loading v-if="loading">
        Loading...
      </dv-loading>
      <div
        v-else
        class="host-body"
      >
        <div class="decoration">
          <!-- 第一行 -->
          <div class="d-flex jc-between top">
            <!-- 装饰 -->
            <dv-decoration-10 class="dv-dec-10" />

            <dv-decoration-8 class="dv-dec-8" />

            <div class="title">
              <span class="title-text">{{ title }}</span>
              <dv-decoration-6
                class="dv-dec-6"
                :reverse="true"
                :color="['#50e3c2', '#67a1e5']"
              />
            </div>

            <dv-decoration-8
              :reverse="true"
              class="dv-dec-8"
            />

            <dv-decoration-10 class="dv-dec-10-s" />
          </div>
          <!-- 第二行 -->
          <div class="d-flex jc-between px-2">
            <div class="d-flex aside-width">
              <div class="react-left react-l-l ml-4">
                <span class="react-before" />
                <span class="text">{{ title }}</span>
              </div>
              <div class="react-left ml-3">
                <span class="text">{{ title }}</span>
              </div>
            </div>
            <div class="d-flex aside-width">
              <div class="react-right mr-3 ml-2">
                <span class="text">{{ title }}</span>
              </div>
              <div class="react-right react-r-l">
                <span class="react-after" />
                <span class="text">{{ title }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- 第三行 -->
        <div class="body-box">
          <div class="left-box">
            <dv-border-box-12> dv-border-box-12 </dv-border-box-12>
          </div>
          <toolbar 
              v-if="viewerRef && tilesetRef"
              :viewer-ref="viewerRef"
              :tileset-ref="tilesetRef"
            />
          <div class="map-box">
            <cesium
              :get-viewer-and-tile="getViewerAndTile"
            />
          </div>
          <div class="right-box">
            <dv-border-box-12> dv-border-box-12 </dv-border-box-12>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import useDraw from '../utils/useDraw';
import { title } from '../constant/index';
import cesium from './cesium/index.vue';
import toolbar from './cesium/interactions/spatialSearch/index.vue'
import * as Cesium from 'cesium'
const loading = ref(true);

const { appRef, calcRate, windowDraw, unWindowDraw } = useDraw();

//接收子组件 viewerRef 和 tilesetRef 
const viewerRef = ref()
const tilesetRef = ref()
function getViewerAndTile(viewerValue:Cesium.Viewer,tilesetValue:Cesium.Cesium3DTileset){
  viewerRef.value = viewerValue
  tilesetRef.value = tilesetValue
}

const cancelLoading = () => {
  // 模拟加载
  setTimeout(() => {
    loading.value = false;
  }, 500);
};

onMounted(() => {
  cancelLoading();
  calcRate(); // 初始化缩放
  windowDraw(); // 监听窗口变化
});

onBeforeUnmount(() => {
  unWindowDraw(); // 移除监听，避免内存泄漏
});
</script>

<style lang="scss" scoped>
@import url('../assets/scss/index.scss');
</style>
