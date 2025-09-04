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
    infoBox: false, //是否显示信息框
  });

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
