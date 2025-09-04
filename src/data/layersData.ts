//天地图矢量
const tdt_key = import.meta.env.VITE_TIANDITU_TOKEN;
import * as Cesium from 'cesium';
export const img_tdt = new Cesium.WebMapTileServiceImageryProvider({
  url: 'http://{s}.tianditu.com/vec_w/wmts?tk=' + tdt_key,
  layer: 'vec',
  style: 'default',
  tileMatrixSetID: 'w',
  format: 'tiles',
  maximumLevel: 18,
  subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
});
export const img_cia = new Cesium.WebMapTileServiceImageryProvider({
  url: 'http://{s}.tianditu.gov.cn/cva_w/wmts?tk=' + tdt_key,
  layer: 'cva',
  style: 'default',
  tileMatrixSetID: 'w',
  format: 'tiles',
  maximumLevel: 18,
  subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
});

//mapbox
//设置mapbox矢量底图
export const mapbox_navigation_night = new Cesium.MapboxStyleImageryProvider({
  styleId: 'navigation-night-v1',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
export const mapbox_navigation_day = new Cesium.MapboxStyleImageryProvider({
  styleId: 'navigation-day-v1',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
export const mapbox_streets = new Cesium.MapboxStyleImageryProvider({
  styleId: 'streets-v12',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
export const mapbox_outdoors = new Cesium.MapboxStyleImageryProvider({
  styleId: 'outdoors-v12',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
export const mapbox_light = new Cesium.MapboxStyleImageryProvider({
  styleId: 'light-v11',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
export const mapbox_dark = new Cesium.MapboxStyleImageryProvider({
  styleId: 'dark-v11',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
// 1. 先把所有 png 变成真正的 URL
const pics = import.meta.glob('@/assets/mapboxLayersPic/*.png', {
  eager: true,
  import: 'default',
});

// 2. 组装成自己需要的结构
export const mapboxPicUrl = {
  mapbox_navigation_night: pics[
    '/src/assets/mapboxLayersPic/mapbox-navigation-night.png'
  ] as string,
  mapbox_navigation_day: pics[
    '/src/assets/mapboxLayersPic/mapbox-navigation-day.png'
  ] as string,
  mapbox_streets: pics[
    '/src/assets/mapboxLayersPic/mapbox-streets.png'
  ] as string,
  mapbox_outdoors: pics[
    '/src/assets/mapboxLayersPic/mapbox-outdoors.png'
  ] as string,
  mapbox_light: pics['/src/assets/mapboxLayersPic/mapbox-light.png'] as string,
  mapbox_dark: pics['/src/assets/mapboxLayersPic/mapbox-dark.png'] as string,
};

//高德矢量，高德位置偏移
export const gaode = new Cesium.UrlTemplateImageryProvider({
  url: 'http://webst02.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}',
});
