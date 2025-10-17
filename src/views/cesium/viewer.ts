import * as Cesium from 'cesium';
import '../../assets/Widgets/widgets.css';
import {
  outlinePolygon,
  area,
  createLine3D,
  cartographic,
} from './HongKong/handelDataHK';
// import { drawPolygon } from './HongKong/drawPolygon'
import { PolygonCenter } from '@/utils/getFeaturesCenter';

window.CESIUM_BASE_URL = '/';

Cesium.Ion.defaultAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjODg3ZTRkZi05YzVkLTRmZjQtYWZjNC1jMDU2MDM0NDM2ZDQiLCJpZCI6MzMyMjExLCJpYXQiOjE3NTUyMzQyNjd9.awG47M-CDpObyp-29CPk8Le6R_ExZqm_h5xM7gINWkU';

export async function createViewer(container: string | HTMLElement) {
  const viewer = new Cesium.Viewer(container, {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    timeline: true, //显示时间轴
    animation: true, //显示播放控件
    infoBox: false, //是否显示信息框
    baseLayerPicker: false,
    sceneModePicker: false,
    homeButton: false,
    geocoder: false,
    navigationHelpButton: false
  });


  (viewer.timeline as any).makeLabel = function (time: any) {
    return Cesium.JulianDate.toDate(time).toLocaleString('zh-CN', {
      hour12: false,
      timeZone: 'Asia/Shanghai'
    })
  }
  viewer.animation.viewModel.timeFormatter = function (date: Cesium.JulianDate, viewModel: any) {
    return Cesium.JulianDate.toDate(date).toLocaleString('zh-CN', {
      hour12: false,
      timeZone: 'Asia/Shanghai'
    })
  }
  // 隐藏版权信息
  viewer._cesiumWidget._creditContainer.style.display = "none"; //存在

  modifyMap(viewer)

  viewer.entities.add(area);
  const line3D = await createLine3D(cartographic);
  viewer.entities.add(line3D);
  // await drawPolygon(viewer)
  const center = PolygonCenter(outlinePolygon);


  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      center.geometry.coordinates[0],
      center.geometry.coordinates[1],
      100
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0,
    },
  });
  //空间查询高亮建筑

  return viewer;
}

function modifyMap(viewer: Cesium.Viewer) {
  //获取底图影像图层
  const baseLayer: any = viewer.imageryLayers.get(0)

  //定义两个属性来控制是否反向
  baseLayer.invertColor = true
  baseLayer.filterRGB = [0, 50, 100]

  //   更改底图着色器的代码
  const baseFragmentShader = viewer.scene.globe._surfaceShaderSet.baseFragmentShaderSource.sources
  // 关键: 反色+过滤
  // 通常只修改最后一个（第 3 个）
  const lastIndex = baseFragmentShader.length - 1;
  const strS = "color = czm_saturation(color, textureSaturation);\n#endif\n";
  let strT = "color = czm_saturation(color, textureSaturation);\n#endif\n";

  // [0,50,100] 过滤

  // === 插入自定义颜色逻辑 ===
  strT += `
    color.r = 1.0 - color.r;
    color.g = 1.0 - color.g;
    color.b = 1.0 - color.b;
    color.r *= 0.0 / 255.0;
    color.g *= 50.0 / 255.0;
    color.b *= 100.0 / 255.0;
  `;

  baseFragmentShader[lastIndex] = baseFragmentShader[lastIndex].replace(strS, strT);

}
