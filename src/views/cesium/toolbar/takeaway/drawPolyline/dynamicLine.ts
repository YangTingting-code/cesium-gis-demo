import * as Cesium from 'cesium'
import { OrderStore } from '../db/OrderStore'
import image from '@/assets/stripe2.png'
import { position2bbox } from '@/utils/aboutCamera'
import * as turf from '@turf/turf'
import {
  Cartesian3,
  Color,
  Primitive,
  PolygonGeometry,
  BoxGeometry,
  PolygonHierarchy,
  PolylineGeometry,
  EllipsoidGeometry,
  GeometryInstance,
  Material,
  MaterialAppearance,
  PolylineMaterialAppearance,
  Transforms,
} from 'cesium'
export function dynamicTest(viewer: Cesium.Viewer) {
  const shaderSource = `
	uniform vec4 color;
	uniform float percent; //比例从线宽换成区域的宽度
  uniform float speed;
  
	czm_material czm_getMaterial(czm_materialInput materialInput)
	{
		vec4 outColor = color;
		czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 st = materialInput.st; //s横坐标 t纵坐标
    
    // float time = fract ( czm_frameNumber / 144.0 ); // 在144帧之间从0-1不断循环的数字,因为是取小数
    //如何时间非线性？time 是0-1之间 当成x 可用y=f(x) 时间函数
    // time = pow(time,2.0);
    //speed控制动画速率
    float time = fract( czm_frameNumber * speed / 1000.0 );
    // 精确的控制动画的时间? 不是传递一个uniform 每次绘制时传递时间差值 和frameNumber类似, 从0开始增加, 每次绘制传递距离第一次绘制经过的毫秒数。 传递方式是requestAnimationFrame不断改变创建的Material的uniform
    float startPosition = time; //位置占比

    // 区域
    // if(st.s > startPosition - percent / 2.0 && st.s < startPosition + percent / 2.0) {
    //   outColor.rgb = vec3(0.0, 1.0, 0.0);
    // }

    // outColor.a = 0.0; //透明度默认为0

    // 映射 把区域的颜色映射到0-1, 根据不同的坐标位置会有不一样的颜色 只需要映射 percent 颜色区域范围内的 即if条件下的
    
    // if(st.s > startPosition - percent && st.s < startPosition ){
    //   // 使用smoothstep替换原本的线性映射
    //   float value = smoothstep(startPosition - percent, startPosition, st.s);
    //   // float value = (st.s - (startPosition - percent)) / percent; //线性映射
    //   // outColor.rgb = vec3(0.0,value,0.0); //颜色为绿色
    //   outColor.a = value; //根据计算出来的比例设置透明度,此时颜色是传入的红色
    // }

    //取消if判断 用step函数
    float value = smoothstep(startPosition - percent, startPosition, st.s) * step(-time, -st.s);
    // 对于小于区间的,smoothstep函数返回0 , 对于大于区间的 smoothstep 返回1 ; step(-time, -st.s) 在大于区间的地方值为0 这样区间外的地方value为0
    outColor.a = value;
		material.diffuse = czm_gammaCorrect(outColor.rgb);
		material.alpha = outColor.a;
		return material;
	}
`
  const myMaterial = new Material({
    translucent: false,
    fabric: {
      type: 'test',
      uniforms: {
        color: new Color(1, 0, 0, 1),
        percent: 0.3,
        speed: 2,
      },
      source: shaderSource
    }
  })

  const appearance = new MaterialAppearance({
    material: myMaterial,
  })

  const polylineAppearance = new PolylineMaterialAppearance({
    material: myMaterial
  })

  const polygonPrimitive = new Primitive({
    geometryInstances: new GeometryInstance({
      geometry: new PolygonGeometry({
        polygonHierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArray([
          114, 25,
          114.01, 25,
          114.01, 25.01,
          114, 25.01,
        ])),
        height: 1000
      })
    }),
    appearance
  })

  const boxPrimitive = new Primitive({
    geometryInstances: new GeometryInstance({
      geometry: BoxGeometry.fromDimensions({
        dimensions: new Cartesian3(1000, 1000, 1000)
      }),
      modelMatrix: Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(114.005, 25.02, 1000))
    }),
    appearance
  })

  const polylinePrimitive = new Primitive({
    geometryInstances: new GeometryInstance({
      geometry: new PolylineGeometry({
        positions: Cartesian3.fromDegreesArrayHeights([
          114.02, 25.02, 1000,
          114.05, 25.02, 1000
        ]),
        width: 2,
      })
    }),
    appearance: polylineAppearance
  })

  const ellipsoidPrimitive = new Primitive({
    geometryInstances: new GeometryInstance({
      geometry: new EllipsoidGeometry({
        radii: new Cartesian3(1000, 1000, 1000),
      }),
      modelMatrix: Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(114.03, 25.005, 1000))
    }),
    appearance
  })

  viewer.scene.primitives.add(polygonPrimitive)
  viewer.scene.primitives.add(boxPrimitive)
  viewer.scene.primitives.add(polylinePrimitive)
  viewer.scene.primitives.add(ellipsoidPrimitive)

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(114.02, 25.01, 10000),
    duration: 0
  })
}
const shaderSource = `
    uniform vec4 color;
    uniform float percent; //比例从线宽换成区域的宽度
    uniform float timeUniform;   // ← 新增，外部传入 0~1 的进度

    czm_material czm_getMaterial(czm_materialInput materialInput)
    {
      vec4 outColor = color;
      czm_material material = czm_getDefaultMaterial(materialInput);

      vec2 st = materialInput.st; //s横坐标 t纵坐标
      
      float time = timeUniform;
      // 精确的控制动画的时间? 不是传递一个uniform 每次绘制时传递时间差值 和frameNumber类似, 从0开始增加, 每次绘制传递距离第一次绘制经过的毫秒数。 传递方式是requestAnimationFrame不断改变创建的Material的uniform
      float startPosition = time; //位置占比

      // 区域
      // if(st.s > startPosition - percent / 2.0 && st.s < startPosition + percent / 2.0) {
      //   outColor.rgb = vec3(0.0, 1.0, 0.0);
      // }

      // outColor.a = 0.0; //透明度默认为0

      // 映射 把区域的颜色映射到0-1, 根据不同的坐标位置会有不一样的颜色 只需要映射 percent 颜色区域范围内的 即if条件下的
      
      if(st.s > startPosition - percent / 2.0  && st.s < startPosition + percent / 2.0){ //这样写好像不会有黑色
        // 使用smoothstep替换原本的线性映射
        // float value = smoothstep(startPosition - percent, startPosition, st.s);
        float value = ((st.s + percent / 2.0) - (startPosition - percent / 2.0)) / percent; //线性映射
        outColor.rgb = vec3(0.0,value,0.0); //颜色为绿色
        // outColor.a = value; //根据计算出来的比例设置透明度,此时颜色是传入的红色
      }

      //取消if判断 用step函数 因为shader用if性能不好?
      // float value = smoothstep(startPosition - percent, startPosition, st.s) * step(-time, -st.s);
      // 对于小于区间的,smoothstep函数返回0 , 对于大于区间的 smoothstep 返回1 ; step(-time, -st.s) 在大于区间的地方值为0 这样区间外的地方value为0
      // outColor.a = value;
      // outColor.rgb = vec3(0.0,value,0.0);
      
      material.diffuse = czm_gammaCorrect(outColor.rgb);
      material.alpha = outColor.a;
      return material;
    }
  `
export const myMaterial = new Material({
  translucent: false,
  fabric: {
    type: 'test',
    uniforms: {
      color: Cesium.Color.CYAN,
      percent: 0.2,
      speed: 2.0,
      timeUniform: 0.0,

    },
    source: shaderSource
  }
})


export async function dynamicPolylineVolumeCustom(viewer: Cesium.Viewer, car3: Cesium.Cartesian3[]) {
  const appearance = new MaterialAppearance({
    material: myMaterial_PV,
  })

  const centerLine = car3 //中心线点 

  //定义横截面形状
  const width = 5
  const height = 5
  const shape = [
    new Cesium.Cartesian2(-width, -height),
    new Cesium.Cartesian2(width, -height),
    new Cesium.Cartesian2(width, height),
    new Cesium.Cartesian2(-width, height),
  ]

  const geometry = new Cesium.PolylineVolumeGeometry({
    polylinePositions: centerLine,
    shapePositions: shape
  })
  const polylineVolume = new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: geometry
    }),
    appearance: appearance
  })
  viewer.scene.primitives.add(polylineVolume)

  //照相机视野
  const orderStore = new OrderStore()
  const order0 = await orderStore.getOrderFirst()
  if (!order0) return
  const path = order0.fullpath //结构: [ [lng,lat], [lng,lat], ... ]
  if (!path) return
  const line = turf.lineString(path)
  const bbox = turf.bbox(line)
  position2bbox(bbox, viewer)
}
const shaderSource_PV = `
    uniform vec4 color;
    uniform float progress;
    uniform float percent;

    czm_material czm_getMaterial(czm_materialInput materialInput)
    {
      vec4 outColor = color;
      czm_material material = czm_getDefaultMaterial(materialInput);
      vec2 st = materialInput.st;
      if( st.s < progress + percent / 2.0 && st.s > progress - percent / 2.0 ) {
        outColor.rgb = vec3(0.0, 1.0, 0.0);
      }
      
      material.diffuse = czm_gammaCorrect(outColor.rgb);
      material.alpha = outColor.a;
      return material;
    }
  `
const shaderSource_PV2 = `
uniform vec4 color;              // 主色
uniform float progress;
uniform float percent;            

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    // 计算当前位置的光带范围
    float dist = abs(st.s - progress);
    float halfLen = percent / 2.0;

    // 光带强度 (边缘衰减，中心更亮)
    float intensity = smoothstep(halfLen, 0.0, dist); // 这个什么意思?

    // 增加呼吸流动感 (随时间波动)
    float time = fract( czm_frameNumber / 144.0 );
    float pulse = 0.5 + 0.5 * sin(time * 3.0 + st.s * 10.0); //这个什么意思? 能不能让颜色变化更柔和一点?

    // 主色：电光绿 + 青色渐变
    vec3 baseColor = mix(vec3(0.0, 1.0, 0.7), vec3(0.0, 1.0, 0.0), st.s); //这个是两个颜色混合在一起吗? st.s在这里什么意思?

    // 结合强度和脉动
    vec3 finalColor = baseColor * intensity * (0.7 + 0.3 * pulse);

    material.diffuse = czm_gammaCorrect(finalColor);
    material.alpha = intensity; // 边缘透明
    return material;
}
`
const test = `
uniform vec4 color;              // 主色（基础轨迹用）
uniform float progress;          // 光带中心 (0~1)
uniform float percent;           // 光带长度比例 (米数/总长)

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    // =====================
    // 1. 整条轨迹底色
    // =====================
    // 沿线渐变：青绿 -> 绿色
    vec3 trailColor = mix(
        vec3(0.0, 0.6, 0.3),   // 起点偏青绿
        vec3(0.0, 0.9, 0.0),   // 终点偏纯绿
        st.s
    );

    // =====================
    // 2. 动态光带
    // =====================
    float dist = abs(st.s - progress);
    float halfLen = percent / 2.0;

    // 光带强度 (中心最亮, 边缘平滑过渡到0)
    float intensity = smoothstep(halfLen, 0.0, dist);

    // 呼吸脉动效果 (随时间律动)
    float time = fract(czm_frameNumber / 144.0);
    float pulse = 0.7 + 0.3 * sin(time * 2.0 + st.s * 8.0);

    // 光带颜色：电光绿
    vec3 glowColor = vec3(0.0, 1.0, 0.0) * intensity * pulse;

    // =====================
    // 3. 合成最终颜色
    // =====================
    vec3 finalColor = trailColor + glowColor;

    material.diffuse = czm_gammaCorrect(finalColor);
    material.alpha = max(0.4, intensity); // 底色保持半透明，光带更亮
    return material;
}`

const test2 = `
uniform float progress;          // 光带中心 (0~1)
uniform float percent;           // 光带长度比例 (米数/总长)

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    // =====================
    // 1. 底色轨迹 (始终显示, 清晰可见)
    // =====================
    vec3 trailColor = mix(
        vec3(0.0, 0.9, 0.6),   // 起点: 青绿
        vec3(0.0, 0.7, 0.3),   // 终点: 绿色
        st.s
    );

    // =====================
    // 2. 动态光带 (骑手当前位置)
    // =====================
    float dist = abs(st.s - progress);
    float halfLen = percent / 2.0;
    float intensity = smoothstep(halfLen, 0.0, dist);
    

    float time = fract(czm_frameNumber / 144.0);
    float pulse = 0.75 + 0.25 * sin(time * 3.0 + st.s * 8.0);
    

    vec3 glowColor = vec3(0.0, 1.0, 0.9) * intensity * pulse; // 电光蓝青

    // =====================
    // 3. 尾迹拖影 (骑手身后淡出)
    // =====================
    float fadeTrail = smoothstep(0.0, 0.5, progress - st.s);

    vec3 tailColor = vec3(0.0, 0.8, 0.5) * fadeTrail; // 青绿淡影

    // =====================
    // 4. 合成颜色
    // =====================
    vec3 finalColor = trailColor * 0.6 + tailColor + glowColor;

    material.diffuse = czm_gammaCorrect(finalColor);
    material.alpha = max(0.5, max(intensity, fadeTrail)); 
    
    return material;
}


`
const shaderSource_PV3 = `
uniform float progress;          // 光带中心 (0~1)
uniform float percent;           // 光带长度比例 (米数/总长)

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    // =====================
    // 1. 基础轨迹 (全程均匀 + 呼吸)
    // =====================
    float time = fract(czm_frameNumber / 144.0);

    // 呼吸脉冲，整条线亮度上下浮动 0.7~1.0
    float breathe = 0.9 + 0.3 * sin(time * 1.5); 
    
    // 统一的青绿底色（不随 st.s 改变，保持亮度均匀）
    vec3 trailColor = vec3(0.0, 0.8, 0.5) * breathe;

    // =====================
    // 2. 动态光带 (骑手当前位置)
    // =====================
    float dist = abs(st.s - progress);
    float halfLen = percent / 2.0;

    float intensity = smoothstep(halfLen, 0.0, dist);
// float intensity = exp(-pow(dist / halfLen, 2.0));
    // float pulse = 0.75 + 0.25 * sin(time * 2.5 + st.s * 8.0);
  float pulse = 0.8 + 0.2 * sin(time * 3.0); // 不加 st.s，脉冲更集中在骑手位置
    vec3 glowColor = vec3(0.0, 1.0, 0.9) * intensity * pulse; // 电光蓝青

    // =====================
    // 3. 合成颜色
    // =====================
    vec3 finalColor = trailColor + glowColor;
    
    material.diffuse = czm_gammaCorrect(finalColor);
    material.alpha = 0.7; 
    // material.alpha = clamp(0.55 + 0.45 * intensity, 0.55, 1.0);

    return material;
}
`

export const myMaterial_PV = new Material({
  translucent: true,
  fabric: {
    type: 'test',
    uniforms: {
      progress: 0.0,
      percent: 0.2, //比例
    },
    source: shaderSource_PV3
  }
})

export async function dynamicPolylineCustom(viewer: Cesium.Viewer, car3: Cesium.Cartesian3[]) {
  const appearance = new PolylineMaterialAppearance({
    material: myMaterial2,
  })

  const centerLine = car3 //中心线点 
  const geometry = new Cesium.PolylineGeometry({
    positions: centerLine,
    width: 5
  })
  const polylineVolume = new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: geometry
    }),
    appearance: appearance
  })
  viewer.scene.primitives.add(polylineVolume)

  //照相机视野
  const orderStore = new OrderStore()
  const order0 = await orderStore.getOrderFirst()
  if (!order0) return
  const path = order0.fullpath //结构: [ [lng,lat], [lng,lat], ... ]
  if (!path) return
  const line = turf.lineString(path)
  const bbox = turf.bbox(line)
  position2bbox(bbox, viewer)
}
const shaderSource2 = `
    uniform vec4 color;
    uniform float totalDistance;
    uniform float currentDistance;
    uniform float windowLength;

    czm_material czm_getMaterial(czm_materialInput materialInput)
    {
      vec4 outColor = color;
      czm_material material = czm_getDefaultMaterial(materialInput);
      
      float sCoord = materialInput.s * totalDistance;  // 0~1
      if((sCoord > currentDistance - windowLength / 2.0) &&
        (sCoord < currentDistance + windowLength/ 2.0)) {
        outColor.rgb = vec3(0.0, 1.0, 0.0);
      }
      
      material.diffuse = czm_gammaCorrect(outColor.rgb);
      material.alpha = outColor.a;
      return material;
    }
  `
export const myMaterial2 = new Material({
  translucent: true,
  fabric: {
    type: 'test',
    uniforms: {
      color: Cesium.Color.CYAN,
      totalDistance: 0.0, // order0.distance（总米数） 
      currentDistance: 0.0, //cumDriverDistance 累计米数
      windowLength: 100.0, //想要动态线的长度，米
    },
    source: shaderSource2
  }
})
