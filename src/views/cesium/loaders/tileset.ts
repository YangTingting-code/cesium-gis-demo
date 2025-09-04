import * as Cesium from 'cesium';
// import { createHighlightManager } from '@/utils/manageOSMHighlight';
// import { bounds } from '../HongKong/handelDataHK'
export async function loadOSMBuildings(viewer: Cesium.Viewer) {
  const tileset = await Cesium.createOsmBuildingsAsync();
  viewer.scene.primitives.add(tileset);
  //不设置样式 白膜状态
  return tileset;
}
