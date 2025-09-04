// 本地存储数据 1.先读取本地数据 2.写入本地数据 不用提前创建  如果第一次读取的时候没有会在写入的时候创建
//drillPick 批量处理 把整个屏幕的要素获取到
//1.读 set 能存储唯一数据 不重复存，但不是数组 只能用add
const featuresId = new Set<number>(JSON.parse(localStorage.getItem('featuresId') || '[]'))
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