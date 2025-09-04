import * as Cesium from 'cesium'
import { reactive, ref } from 'vue'
const viewer = ref<Cesium.Viewer | null>();
const featureId = reactive([])
viewer.value.screenSpaceEventHandler.setInputAction(function (click: MouseEvent) {
  const feature = viewer.value?.scene.pick(click.position, 100, 100)
  console.log('feature', feature);

  if (feature instanceof Cesium.Cesium3DTileFeature) {
    feature.color = Cesium.Color.YELLOW
    // console.log('feature.target._batchId',feature.target._batchId)
    console.log('feature._batchId', feature._batchId)
    featureId.push(feature._batchId)
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK)