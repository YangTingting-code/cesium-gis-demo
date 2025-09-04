import { Viewer, Cartesian3, Math, HeadingPitchRange } from 'cesium';
export function flyByEId(targetId: string | number, viewer: Viewer) {
  // 1.从本地数据集找这栋楼
  const dataset = JSON.parse(localStorage.getItem('OSM3dInfos') || '{}');
  const info = dataset[targetId];
  if (info) {
    //2.取坐标
    const lng = +info['cesium#longitude'];
    const lat = +info['cesium#latitude'];
    const alt = +info['cesium#estimatedHeight'] + 50; //上空50m
    //地面中心
    const center = Cartesian3.fromDegrees(lng, lat, 0);
    //3.飞过去
    /* viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(lng, lat, height),
      orientation: {
        heading: 0,
        pitch: Math.toRadians(-45),
        roll: 0
      },
      duration: 1.5
    }) */

    //3.让相机“看向”这一点
    const heading = Math.toRadians(0);
    const pitch = Math.toRadians(-45);
    const range = 150;
    const offset = new HeadingPitchRange(heading, pitch, range);
    viewer.camera.lookAt(
      center, //中心点
      offset //偏移
    );
  }
}
