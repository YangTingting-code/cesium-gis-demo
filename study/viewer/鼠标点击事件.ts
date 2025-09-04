const featuresId = new Set<number>(JSON.parse(localStorage.getItem('featuresId') || '[]'))
//screenSpaceEventHandler setInputAction  ScreenSpaceEventType
viewer.value.screenSpaceEventHandler.setInputAction((click) => {
  const { clientWidth, clientHeight } = viewer.value.canvas
  //第一个1000是最多返回的个数
  const features = viewer.value?.scene.drillPick(click.position, 1000, clientWidth, clientHeight)
  //如果有数据 就循环处理 
  if (features) {
    features.forEach((f, idx) => {
      if (f instanceof Cesium.Cesium3DTileFeature) {
        ///要素是Cesium3DTileFeature的涂成黄色
        f.color = Cesium.Color.YELLOW
        // console.log(`feature[${idx}]的id`,f._batchId);
        featuresId.add(f._batchId)
      }
    })
    //循环完之后写入
    localStorage.setItem('featuresId', JSON.stringify([...featuresId]))
  }

}, Cesium.ScreenSpaceEventType.LEFT_CLICK)