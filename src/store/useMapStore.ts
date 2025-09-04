//管理地图状态
import { defineStore } from 'pinia';
import * as Cesium from 'cesium';
//定义并暴露一个store 管理map上面鼠标点击绘制的点
export const usePointsStore = defineStore('points', {
  //状态
  state: () => ({
    clickedPoints: [] as Cesium.Cartesian3[],
    clickedPointEntities: [] as Cesium.Entity[],
    serchRadius: 100, //米
    searchCircleEntities: [] as Cesium.Entity[],
  }),
  //动作
  actions: {
    //鼠标点击新增点
    addPoint(point: Cesium.Cartesian3) {
      this.clickedPoints.push(point);
    },
    //添加点实体
    addPointEntity(pointEntity: Cesium.Entity) {
      this.clickedPointEntities.push(pointEntity);
    },
    getRadius() {
      return this.serchRadius;
    },
    //设置搜索圆半径
    setRadius(radius: number) {
      this.serchRadius = radius;
    },
    //添加搜索圆实体
    addCircleEntity(circleEntity: Cesium.Entity) {
      this.searchCircleEntities.push(circleEntity);
    },
    //清除这些搜索圆entity
    clearCircleEntities(viewer: Cesium.Viewer) {
      this.searchCircleEntities.forEach((entity: Cesium.Entity) => {
        viewer.entities.remove(entity);
      });
      //同时删除所有的Point Entities
      this.clickedPointEntities.forEach((entity: Cesium.Entity) => {
        viewer.entities.remove(entity);
      });
      //同时清除这些点击的点
      this.clickedPoints = [];
    },
    //删除指定的搜索圆呢？
    clearCircleEntityById(
      circleEntityId: string,
      pointEntityId: string,
      viewer: Cesium.Viewer
    ) {
      viewer.entities.removeById(circleEntityId); //搜索圆和点击的点的entityId能一样吗？,不能 一样的id的话后面的entity会覆盖前面的
      viewer.entities.removeById(pointEntityId);
    },
  },
  //计算
});

//用于高亮 后期处理
/* export const useSearchStore = defineStore('osm3DFeature', {
  state: () => ({
    // 唯一的高亮后期阶段
    stage: null as Cesium.PostProcessStageComposite | null,
    // 当前被高亮的要素数组
    highlightedFeatures: [] as Cesium.Cesium3DTileFeature[],
  }),
  actions: { */
/**
 * 初始化（全局只需调用一次） 放在创建完viewer之后
 */
/* init(viewer: Cesium.Viewer) {
  // console.log('init之前this.stage', this.stage)
  if (!this.stage) {
    // console.log('开始stage初始化')
    this.stage = Cesium.PostProcessStageLibrary.createSilhouetteStage();
    this.stage.uniforms.color = Cesium.Color.CYAN;
    this.stage.selected = [];
    viewer.scene.postProcessStages.add(this.stage); */
// console.log('stage存在吗？', this.stage);

//   }
// },
/* addOSM3DFeature(feature: Cesium.Cesium3DTileFeature) {
  this.highlightedFeatures.push(feature)
}, */
/**
 * 高亮一个或多个 3DTileFeature
 */
/* highlight(features: Cesium.Cesium3DTileFeature[]) {
  console.log('stage存在吗？', this.stage);
  if (!this.stage) return;
  this.highlightedFeatures = features;
  this.stage.selected = features;
}, */
/**
 * 清空高亮
 */
/* clear() {
  if (!this.stage) return;
  this.highlightedFeatures = [];
  this.stage.selected = [];
},
},
}) */
