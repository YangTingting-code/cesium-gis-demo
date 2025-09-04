import * as Cesium from 'cesium';
export function correctPosition(
  viewer: Cesium.Viewer,
  click: Cesium.ScreenSpaceEventHandler.PositionedEvent
) {
  const rect = viewer.canvas.getBoundingClientRect();
  // 计算当前缩放比例
  const scaleX = rect.width / viewer.canvas.width;
  const scaleY = rect.height / viewer.canvas.height;
  // 修正坐标
  const correctedPosition = new Cesium.Cartesian2(
    click.position.x / scaleX,
    click.position.y / scaleY
  );
  return correctedPosition;
}

export function getScale(viewer: Cesium.Viewer) {
  const rect = viewer.canvas.getBoundingClientRect();
  // 计算当前缩放比例
  const scaleX = rect.width / viewer.canvas.width;
  const scaleY = rect.height / viewer.canvas.height;
  return { scaleX, scaleY }
}

