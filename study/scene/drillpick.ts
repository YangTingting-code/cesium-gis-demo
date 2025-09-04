//drillPick 批量处理 把整个屏幕的要素获取到
const { clientWidth, clientHeight } = viewer.value.canvas
viewer.value.screenSpaceEventHandler.setInputAction((click) => {
  //第一个1000是最多返回的个数
  const features = viewer.value?.scene.drillPick(click.position, 1000, clientWidth, clientHeight)
  //如果有数据 就循环处理 
  if (features) {
    features.forEach((f, idx) => {
      if (f instanceof Cesium.Cesium3DTileFeature) {
        ///弄成黄色
        f.color = Cesium.Color.YELLOW
        console.log(`feature[${idx}]的id`, f._batchId);
      }
    })
  }

}, Cesium.ScreenSpaceEventType.LEFT_CLICK)