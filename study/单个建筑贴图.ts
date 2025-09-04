import * as Cesium from 'cesium';
import { getDataset } from '@/utils/handleData';

export function test2(viewer: Cesium.Viewer) {
  const data = getDataset();
  if (!data || !data.length) return;

  const maxValue = Math.max(...data.map(d => d.orders));

  // 获取数据范围
  const lons = data.map(d => d['cesium#longitude']);
  const lats = data.map(d => d['cesium#latitude']);
  const west = Math.min(...lons);
  const east = Math.max(...lons);
  const south = Math.min(...lats);
  const north = Math.max(...lats);

  // 创建 Canvas 和材质
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);

  const material = new Cesium.Material({
    fabric: {
      type: 'Image',
      uniforms: { image: canvas.toDataURL() }
    }
  });

  const instance = new Cesium.GeometryInstance({
    geometry: new Cesium.RectangleGeometry({
      rectangle,
      vertexFormat: Cesium.MaterialAppearance.VERTEX_FORMAT
    })
  });

  const primitive = new Cesium.GroundPrimitive({
    geometryInstances: instance,
    appearance: new Cesium.MaterialAppearance({
      material,
      translucent: true
    }),
    classificationType: Cesium.ClassificationType.TERRAIN | Cesium.ClassificationType.CESIUM_3D_TILE
  });

  viewer.scene.primitives.add(primitive);

  // 绘制热力点函数
  function drawHeatmap() {
    // Canvas 尺寸自适应相机
    const rectWidth = viewer.scene.canvas.width;
    const rectHeight = viewer.scene.canvas.height;
    canvas.width = rectWidth;
    canvas.height = rectHeight;

    ctx.clearRect(0, 0, rectWidth, rectHeight);

    const radius = Math.max(10, rectWidth / 50);

    data.forEach(d => {
      const x = ((d['cesium#longitude'] - west) / (east - west)) * rectWidth;
      const y = rectHeight - ((d['cesium#latitude'] - south) / (north - south)) * rectHeight;

      const ratio = d.orders / maxValue;
      let color: string;
      if (ratio <= 0.5) {
        const t = ratio / 0.5;
        color = `rgba(0, ${Math.floor(255 * t)}, ${Math.floor(255 * (1 - t))}, 0.6)`;
      } else {
        const t = (ratio - 0.5) / 0.5;
        color = `rgba(${Math.floor(255 * t)}, ${Math.floor(255 * (1 - t))}, 0, 0.6)`;
      }

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });

    // 更新材质
    material.uniforms.image = canvas.toDataURL();
  }

  // 初次绘制
  drawHeatmap();

  // 监听相机移动或缩放
  viewer.camera.changed.addEventListener(drawHeatmap);
}
