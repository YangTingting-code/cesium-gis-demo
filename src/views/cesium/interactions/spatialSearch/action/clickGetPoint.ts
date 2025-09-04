import * as Cesium from 'cesium';
import { ref, type Ref, watch, reactive } from 'vue'
// import { usePointsStore } from '@/store/useMapStore';
import { correctPosition } from '@/utils/correctPosition';
import debounce from 'lodash/debounce';
import DynamicPopup from '@/utils/DynamicPopup'

//获取HK政府提供的数据
// import { getHKWFSByArcGIS } from '../../../HongKong/getWFSData'
// import { handleHKShangYe } from '../../../HongKong/isShangYe'
//获取osm提供的建筑数据
import { queryOSM, queryOSMBatch } from './OSMBuilding';
//高亮对应osmid的建筑
import { createHighlightManager } from '@/utils/manageOSMHighlight';

//创建处理器名称 方便移除监听事件
let clickHandler: Cesium.ScreenSpaceEventHandler;
//创建旗帜 标识是否开启监听
let index = -1;
//点击屏幕上的??按键，调用这个函数
//只创建一次
let highlightMgr: ReturnType<typeof createHighlightManager> | null = null;

//用对象存储 每一个搜索圈的建筑id 用entityId 图钉图标id管理
// const highlightedIdsMap:Record<string,highlightedIdsType> = {}
//封装osm查询 queryOSM
const debounceQueryOSMBatch = debounce(queryOSMBatch, 600) //600ms内无变化再执行
//保存所有搜索圆
interface searchCirclesType {
  point: Cesium.Entity
  circle: Cesium.Entity
  pin: Cesium.Entity
  popup: DynamicPopup
}
export const searchCircles: Record<string, searchCirclesType> = {}

//到时候记得清空
const tuDingEntityCollect: Record<string, { lng: number, lat: number }> = reactive({})

//全局chartData
interface chartData {
  value: number
  name: string
}
let chartDataArr: Record<string, chartData[]> = reactive({})

export function clickScreenGetPoint(
  viewer: Cesium.Viewer,
  tileset: Cesium.Cesium3DTileset,
  radius: Ref<number>
) {
  if (!highlightMgr) {
    highlightMgr = createHighlightManager(tileset);
  }

  //深度缓冲 图形/点/射线是否被地形遮挡？ 想要点击落在真实地形上就开启 （开启了地形）
  //后面添加了billboard 点击billboard想弹出弹窗 而不是新增一个搜索圈 让他不要那么容易点击到其他地方
  // viewer.scene.globe.depthTestAgainstTerrain = true;
  //这样写一串会污染全局 移除监听事件的话会全局的一起移除
  // viewer.screenSpaceEventHandler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  clickHandler.setInputAction(
    async (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      // 修正鼠标坐标
      const correctedPosition: Cesium.Cartesian2 = correctPosition(
        viewer,
        click
      )
      //鼠标移动 监听billboard图层
      // 拾取图钉图标
      const picked = viewer.scene.pick(correctedPosition)
      console.log('picked', picked);

      //为什么不用billboard来判断 因为可能有其他billboard 不太稳妥
      if (Cesium.defined(picked) && picked.id) {
        // console.log('picked.id._id', picked.id._id);
        // console.log('picked.id._id true or false', picked.id._id.includes('circle-center'));
        // picked.id._id.includes('circle-center')
        //如果是点到了图钉上面 就不绘制圆圈 控制弹窗的显隐
        if (picked.id._id.includes('circle-center')) {
          console.log('不要再绘制圆圈');
          //获取到对应的弹窗实例  用图钉的id作为键值存储在
          const popup = searchCircles[picked.id._id].popup
          console.log("popup拿到了吗？", popup)

          //弹窗切换
          popup.toggle()
          // 如果需要，保存实例用于后续销毁
          // popup.destroy();
          return
        }
      }

      //鼠标在屏幕上的像素坐标
      const cartesian = viewer.scene.pickPosition(correctedPosition); //Car3
      //注意是弧度经纬度
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian); //Car3 --> 弧度经纬度
      const lng = Cesium.Math.toDegrees(cartographic.longitude); //弧度转度
      const lat = Cesium.Math.toDegrees(cartographic.latitude); //弧度转度
      const h = cartographic.height; //高度不用转弧度
      // const radius = pointStore.getRadius();

      //添加鼠标点击的点
      const point = new Cesium.Entity({
        id: `point-${index++}`,
        //笛卡尔3
        position: Cesium.Cartesian3.fromDegrees(lng, lat, h + 10), ////也可以写成 cartesian,
        point: {
          color: Cesium.Color.RED,
          pixelSize: 16,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,

        },
      });

      //以点为圆心绘制圆圈
      const circle = new Cesium.Entity({
        id: `circle-${index}`,
        position: Cesium.Cartesian3.fromDegrees(lng, lat, h),
        ellipse: {
          semiMajorAxis: new Cesium.CallbackProperty(() => radius.value, false),
          semiMinorAxis: new Cesium.CallbackProperty(() => radius.value, false),
          material: Cesium.Color.ORANGE.withAlpha(0.25),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })
      //在圆心添加图钉
      const pinBuilder = new Cesium.PinBuilder()
      const pin = new Cesium.Entity({
        id: `circle-center-${index}`,
        position: Cesium.Cartesian3.fromDegrees(lng, lat, h),
        billboard: {
          image: pinBuilder.fromColor(Cesium.Color.ROYALBLUE, 60).toDataURL(),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY // 超过这个距离就不受深度测试影响
        }
      })
      viewer.entities.add(point)
      viewer.entities.add(circle)
      viewer.entities.add(pin)

      const tuDingEntityId = `circle-center-${index}` //这是图钉的id
      tuDingEntityCollect[tuDingEntityId] = { lng, lat }

      try {
        //初次查询osm建筑并选出是商业的 带上图钉图标的id查询 创建对应的chartData
        await queryOSM(lng, lat, radius.value, tuDingEntityId, chartDataArr, highlightMgr) //但是点击第二个圆圈上一个圆圈的高亮就被清空了 没有记住
        // 创建弹窗 一得到查询结果就创建弹窗
        const popup = new DynamicPopup({
          id: `popup-${index}`,
          title: '区域功能结构图',
          viewer,
          entityId: tuDingEntityId,
          showRef: ref(true),
          chartData: chartDataArr[tuDingEntityId], //注意这里传reactive 全局共用了一个chartData
          // 传入一个移除搜索圈的函数
          onDelete: () => removeCircle(viewer, tuDingEntityId) //传回调
        })
        searchCircles[tuDingEntityId] = { point, circle, pin, popup }
      } catch (err) {
        console.dir(err)
      }

      // 监听半径变化，动态重新查询 防抖
      watch(radius, async (newValue) => {
        try {
          // await debounceQueryOSM(lng, lat, newValue, tuDingEntityId)
          debounceQueryOSMBatch(tuDingEntityCollect, newValue, chartDataArr,
            highlightMgr)

        } catch (err) {
          console.dir(err)
        }
      })
      //查找HK_Shang_Ye建筑 数据源于政府
      /* const searchResult = await getHKWFSByArcGIS(lng, lat, radius)
      console.log('searchResult', searchResult) */
      //用HK给的数据高亮
      // await handleHKShangYe(searchResult, viewer)
      //给osm数据高亮 在这个范围内搜查 收集这些要素的信息并且突出显示 （逻辑复用 矩形、多边形）
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

//2.移除点击事件
export function unClickScreenGetPoint() {
  if (clickHandler) {
    clickHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }
}

//3.删除某个圆
export function removeCircle(viewer: Cesium.Viewer, entityId: string) {
  const circleObj = searchCircles[entityId]
  if (!circleObj) return

  //删除实体
  viewer.entities.remove(circleObj.point)
  viewer.entities.remove(circleObj.circle)
  viewer.entities.remove(circleObj.pin)

  //销毁弹窗
  circleObj.popup.destroy()

  //清除高亮
  if (highlightMgr) {
    highlightMgr.removeCategoryIds(entityId)
  }

  //从管理对象中移除
  delete searchCircles[entityId]

  //图钉管理对象
  delete tuDingEntityCollect[entityId]
}
//批量删除圆 没有用到 因为还要处理entityId为数组 不如直接遍历searchCircles调用removeCircle
/* export function removeCircleBatch(viewer: Cesium.Viewer, entityIds: string[]) {
  entityIds.forEach(entityId => {
    removeCircle(viewer, entityId)
  })
} */