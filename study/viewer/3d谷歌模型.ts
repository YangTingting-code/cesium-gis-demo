onMounted(async () => {
  viewer.value = new Cesium.Viewer('cesiumContainer', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    /* 加载谷歌模型需要下面两行
    globe: false,
    geocoder: Cesium.IonGeocodeProviderType.GOOGLE, */
  });
})

try {
  const tileset = await Cesium.createGooglePhotorealistic3DTileset();
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Failed to load tileset: ${error}`);
}