declare module 'cesiumjs-heat' {
  import * as Cesium from 'cesium';
  interface Heatmap {
    destory(): void;
  }
  function getCesiumHeat(
    Cesium: typeof Cesium
  ): new (
    viewer: Cesium.Viewer,
    data: { x: number; y: number; value: number }[],
    bbox?: number[]
  ) => Heatmap;
  export default getCesiumHeat;
}
