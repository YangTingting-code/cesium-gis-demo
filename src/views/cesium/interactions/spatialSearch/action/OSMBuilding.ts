import axios from 'axios'
import * as turf from '@turf/turf'
import { createHighlightManager } from '@/utils/manageOSMHighlight';

// import {Position} from '@/interface/globalInterface'
interface FunctionNode {
  id: number;
  type: 'shop' | 'amenity' | 'office';
  subtype: string; // shop=* / amenity=* / office=*
  lat: number;
  lng: number;
  tag: Record<string, unknown>;
}

interface BuildingProfile {
  id: number; // OSM id
  buildingType: string; // building tag
  geometry: Array<{ lat: number; lng: number }>;
  functionNodes: FunctionNode[];
  tag: Record<string, unknown>;
  commercialScore?: number; // 可选：商业活跃度
  bbox: { maxlat: number; maxlon: number, minlat: number; minlon: number; }; // 边界盒
}

//缓存查询到的对象 用lng,lat,radius作为key 到时候需要把radius提取出来判断是否已缓存
const osmCache: Record<string, BuildingProfile[]> = {}

//用对象存储 每一个搜索圈的建筑id 用entityId 图钉图标id管理
// const highlightedIdsMap: Record<string, Record<string, number[]>> = {}
// 1. 定义类别字面量
export type Category = 'commercial' | 'accommodation' | 'civic' | 'transportation'

interface CategoryRules {
  building?: string[];
  shop?: string[];
  amenity?: string[];
  office?: string[];
}
interface buildingWithCategory {
  id: number; // OSM id
  buildingType: string; // building tag
  geometry: Array<{ lat: number; lng: number }>;
  functionNodes: FunctionNode[];
  tag: Record<string, unknown>;
  commercialScore?: number; // 可选：商业活跃度
  category: Category | 'unknown'
}

interface EachArea {
  id: Number,
  area: Number,
  // geometry: { lat: number; lng: number }[]
}
interface totalArea {
  totalArea: number
}
//生成key
function makeKey(lng: number, lat: number, radius: number) {
  return `${lng},${lat},${radius}`
}

//判断建筑是否在半径内 计算不准确 搜索圈内的有些要素都没有返回
function isBuildingInRadius(lng: number, lat: number, radius: number, building: BuildingProfile): BuildingProfile | undefined {
  //turf判断是否不相交 circle and rectangle
  //turf生成圆形多边形
  const circle = turf.circle([lng, lat], radius, { steps: 64, units: 'meters' })
  const bboxPoly = turf.bboxPolygon([building.bbox.minlon, building.bbox.minlat, building.bbox.maxlon, building.bbox.maxlat])
  const isIntersect = !turf.booleanDisjoint(circle, bboxPoly) //turf判断两个图形是否不相交 不相交是true 相交的是false 和我们的逻辑相反 把结果取反
  // 如果相交那就细看是否有点落在圆圈里面
  if (!isIntersect) return
  const center = turf.point([lng, lat])
  const inside = building.geometry.some(p => {
    //目的地
    const to = turf.point([p.lng, p.lat])
    //距离？
    const distance = turf.distance(center, to, { units: 'meters' })
    //距离是否小于我的搜索半径？ 小于的话说明这个建筑在搜索半径里面 可以返回
    return distance < radius //some里面需要返回布尔值 只要有一个符合就说明这个建筑在搜索半径里面
  })
  return inside ? building : undefined
}

//从缓存中获取数据
function getOSMBuildingsFromCache(lng: number, lat: number, radius: number): BuildingProfile[] | undefined {
  // const key = makeKey(lng,lat,radius)
  const result: BuildingProfile[] = []
  //看key里面的lng和lat有没有当前传入的lng和lat 有的话说明之前缓存过，没有的话就退出直接向overpassApi 发起请求
  for (const key in osmCache) {
    //拆分字符串
    const [lngStr, latStr, radiusStr] = key.split(",") //字符串数组
    //说明之前缓存过
    if (+lngStr === lng && +latStr === lat) {
      //看缓存的半径大还是传入的半径大 缓存的半径大说明之前缓存过
      if (+radiusStr > radius) {
        //说明缓存过 接着就是查找已缓存的数据里面哪些是在范围内的
        //1.获取该对象缓存的所有建筑 逐个遍历
        osmCache[key].forEach(building => {
          const buildingInRadius = isBuildingInRadius(lng, lat, radius, building)
          if (buildingInRadius) result.push(buildingInRadius)
        })
        //遍历判断完成之后返回
        return result
      } else {
        console.log('这个搜索范围比之前的大,直接向overpass API发起请求')
        return
      }
    }
  }
  /*   Object.keys(osmCache).forEach(key => {
      
    }) */

}


//获取OSMBuilding数据
export async function getOSMBuilding(lng: number, lat: number, radius: number) {
  //先从缓存拿数据 
  const cacheBuildings = getOSMBuildingsFromCache(lng, lat, radius)
  //如果cacheBuildings有值 则返回不再向overpassAPI请求 否则继续
  if (cacheBuildings && cacheBuildings.length > 0) {
    console.log("我是从缓存里面拿东西了", cacheBuildings);

    return cacheBuildings
  }
  console.log("cacheBuildings没有东西就进来");

  //为缓存对象生成key 没有做到增量缓存 这是重新生成了一个全新的key 之前中心点是这个的key没有被覆盖
  const key = makeKey(lng, lat, radius)
  osmCache[key] = []
  // 1. 生成 Overpass QL（*直接用 around*，不用 bbox）
  // 把查询字符串 URL 编码，防止特殊字符破坏 URL
  const query = encodeURIComponent(
    `[out:json][timeout:60];
(
  way["building"](around:${radius},${lat},${lng});
  relation["building"](around:${radius},${lat},${lng});
  node["shop"](around:${radius},${lat},${lng});
  node["amenity"](around:${radius},${lat},${lng});
);
out geom;`
  )
  try {
    const res = await axios.get(
      `https://overpass-api.de/api/interpreter?data=${query}`
    );
    console.log('res.data', res.data);

    const buildings: BuildingProfile[] = parseOverpassBuildings(res.data)
    //缓存起来 
    osmCache[key] = buildings
    return buildings;
  } catch (err) {
    console.error('Overpass 请求失败', err);
    return [];
  }
}



//把 Overpass 返回的 JSON 数据整理成BuildingProfile，并关联功能点（shop/amenity/office）到对应建筑，同时计算商业活跃度。

//合法多边形检查器
function isValidPolygon(geom: { lat: number; lng: number }[]): boolean {
  // 面需要闭合 如果首尾不一致需要补上第一个点
  return geom.length >= 4 && geom[0].lat === geom[geom.length - 1].lat && geom[0].lng === geom[geom.length - 1].lng;
}

/**
 * 判断点是否在多边形内（Turf.js 或自写简单点-in-polygon）
 * 这里提供一个二维平面射线法示例，精度够用于商业画像
 */
function pointInPolygon(point: { lat: number; lng: number }, polygon: Array<{ lat: number; lng: number }>) {
  let x = point.lng, y = point.lat;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].lng, yi = polygon[i].lat;
    let xj = polygon[j].lng, yj = polygon[j].lat;

    let intersect = ((yi > y) != (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
//用turf判断点是否在面内
function pointInPolygonTurf(pt: { lat: number; lng: number }, geom: Array<{ lat: number; lng: number }>) {
  if (geom.length < 3) return false // 无法构成面
  const coords = geom.map(p => [p.lng, p.lat])

  // 如果不闭合
  if (!isValidPolygon(geom)) {
    coords.push([...coords[0]]);
  }
  const turfPoint = turf.point([pt.lng, pt.lat])
  const turfPolygon = turf.polygon([coords])
  return turf.booleanPointInPolygon(turfPoint, turfPolygon)
}

/**
 * 转换 Overpass JSON 到 BuildingProfile
 */
function parseOverpassBuildings(data: any): BuildingProfile[] {
  const buildings: BuildingProfile[] = [];
  const nodes: FunctionNode[] = [];
  //用于高亮
  // const buildingId: number[] = []
  // 先拆 node 功能点
  data.elements.forEach((el: any) => {
    if (el.type === 'node' && (el.tags?.shop || el.tags?.amenity || el.tags?.office)) {
      nodes.push({
        id: el.id,
        type: el.tags.shop ? 'shop' : el.tags.amenity ? 'amenity' : 'office',
        subtype: el.tags.shop || el.tags.amenity || el.tags.office,
        lat: el.lat,
        lng: el.lon,
        tag: el.tags
      });
    }
  });

  // 再拆建筑（way/relation）
  data.elements.forEach((el: any) => {
    if (el.tags?.building && (el.type === 'way' || el.type === 'relation')) {
      // relation: 多个 members，取 outer polygon 组合
      let geometry: Array<{ lat: number; lng: number }> = [];
      if (el.type === 'way') {
        geometry = el.geometry.map((p: any) => {
          return { lat: p.lat, lng: p.lon }
        }); //为什么不直接赋值geometry 而是要这样map一个个塞进去？ 因为p对象里面的是{lat,lon}，我要的是{lat,lng}
      } else if (el.type === 'relation' && el.members) {
        el.members.forEach((m: any) => {
          if (m.role === 'outer' && m.type === 'way' && m.geometry) { //如果成员在这栋建筑外面 就把geometry写入 不过为什么要用到展开运算符？ 因为map会返回一个数组 用map循环把lon改成lng但是多包一层数组 需要展开push
            geometry.push(...m.geometry.map((p: any) => ({ lat: p.lat, lng: p.lon })));
          }
        });
      }

      buildings.push({
        id: el.id,
        buildingType: el.tags.building,
        geometry,
        functionNodes: [],
        tag: el.tags,
        bbox: el.bounds
      });
      // buildingId.push(el.id)
    }
  });

  // 关联功能点到建筑
  buildings.forEach(b => {
    nodes.forEach(n => {
      /* if (pointInPolygon({ lat: n.lat, lng: n.lng }, b.geometry)) {
        b.functionNodes.push(n);
      } */
      //  修改成turf
      if (pointInPolygonTurf({ lat: n.lat, lng: n.lng }, b.geometry)) {
        b.functionNodes.push(n);
      }
    });
    // 可选：计算商业活跃度
    b.commercialScore = b.functionNodes.length;
  });

  return buildings;
}

// CATEGORY_RULES 根据 OSM 标签整理
const CATEGORY_RULES: Record<Category, CategoryRules> = {
  commercial: {
    building: ['retail', 'commercial', 'supermarket', 'kiosk', 'office', 'shop', 'industrial'],
    shop: [
      'bakery', 'beverages', 'butcher', 'clothes', 'convenience', 'cosmetics',
      'department_store', 'florist', 'furniture', 'mall', 'supermarket', 'kiosk',
      'hairdresser', 'jewelry', 'shoes', 'electronics', 'books', 'gift', 'alcohol', 'brewing_supplies', 'cheese', 'chocolate', 'coffee', 'confectionery', 'dairy', 'deli', 'food', 'frozen_food', 'greengrocer', 'health_food', 'ice_cream', 'nuts', 'pasta', 'pastry', 'seafood', 'spices', 'tea', 'tortilla', 'water', 'wine', 'fabric', '	jewelry', 'leather', 'shoes', 'tailor', 'watches', 'sewing', '	wool', 'yes'
    ],
    amenity: ['cafe', 'bar', 'restaurant', 'fast_food', 'biergarten', 'food_court', 'ice_cream', 'pub', 'arts_centre', 'casino', 'cinema', 'nightclub'],
    office: ['accounting', 'advertising', 'architecture', 'consulting', 'finance', 'it', 'lawyer', 'advertising_agency', 'architect', 'chamber', 'company', 'construction_company', 'courier', 'coworking', 'educational_institution', 'energy_supplier', 'estate_agent', 'event_management', '	financial', 'financial_advisor', 'transport', 'tax_advisor']
  },
  accommodation: {
    building: [
      'apartments', 'residential', 'house', 'houseboat', 'dormitory', 'hotel',
      'bungalow', 'cabin', 'detached', 'terrace', 'tree_house', 'semidetached_house', "barracks", "annexe", "ger", "static_caravan", "stilt_house", "trullo"
    ]
  },
  civic: {
    building: [
      'civic', 'public', 'school', 'university', 'hospital', 'kindergarten',
      'museum', 'college', 'fire_station', 'government', 'toilets', 'library', 'clock_tower'
    ],
    amenity: [
      'school', 'university', 'college', 'kindergarten', 'library', 'townhall',
      'police', 'hospital', 'clinic', 'toilets', 'fire_station', 'community_centre', 'college', 'atm', 'bank', 'money_transfer', 'baby_hatch', 'social_facility', 'veterinary', 'post_box', 'post_office', 'post_depot', 'courthouse', 'prison', 'ranger_station', 'dressing_room', 'drinking_water', 'lounge', 'mailroom', 'shelter', 'telephone', 'shower', 'water_point', 'watering_place', 'sanitary_dump_station', 'recycling', 'waste_basket', 'waste_disposal', '	waste_transfer_station', 'music_venue', 'social_centre', 'theatre'
    ],
    office: ['association', 'broadcaster', 'charity', 'diplomatic', 'employment_agency', 'government', 'forestry', 'university', 'water_utility', 'visa', 'telecommunication', 'politician', 'harbour_master']
  },
  transportation: {
    building: ['train_station', 'transportation', 'bridge'],
    amenity: ['bus_station', 'taxi', 'parking', 'ferry_terminal', 'political_party', 'bicycle_parking', 'fuel']
  }
};
//把建筑按照类型分类 可以根据osm 文档补充完善
// 4. 分类函数 ": Category | 'unknown'"表示函数返回值的类型
export function classifyBuilding(building: BuildingProfile): Category | 'unknown' {
  const bType = building.buildingType;
  //1.粗分类 先一次性把buildingType看完再看功能点决定
  //前面是对象 CATEGORY_RULES → 用 for…in 拿键
  for (const category in CATEGORY_RULES) {
    const rules = CATEGORY_RULES[category as Category];
    if (rules.building?.includes(bType)) {
      return category as Category;
    }
    //2.如果这个建筑没有buildingType的话就查看功能点匹配 容易以偏概全 不用功能点给建筑类型分类 
    //后面是数组 building.functionNodes → 用 for…of 拿元素
    /* for (const fn of building.functionNodes) {
      if (rules[fn.type as keyof typeof rules]?.includes(fn.subtype)) {
        return category as Category;
      }
    } */
  }
  //粗分类没有匹配上的话 就返回unknow类型
  return 'unknown';
}

// 批量处理建筑数组 分类
export function classifyBuildingsBatch(buildings: BuildingProfile[]): {
  classifiedBuildings: (BuildingProfile & { category: Category | 'unknown' })[],
  categoryIds: Record<Category, number[]>
} {
  const categoryIds: Record<Category, number[]> = {
    commercial: [],
    accommodation: [],
    civic: [],
    transportation: []
  }
  const classifiedBuildings = buildings.map(building => {
    const category = classifyBuilding(building)
    if (category !== 'unknown') {
      categoryIds[category].push(building.id)
    }
    return {
      ...building,
      category
    }
  })
  return {
    classifiedBuildings,
    categoryIds
  }
}

//计算每个BuildingProfile geometry的面积 单位：平方米
function caculateArea(geometry: { lng: number, lat: number }[]) {
  if (geometry.length < 3) return 0; // 不足 3 点无法成面
  // 计算面积 处理数据结构 
  const coords = geometry.map(point => {
    return [point.lng, point.lat]
  })
  // 1. 如果不闭合就让他闭合
  if (!isValidPolygon(geometry)) {
    coords.push([...coords[0]]);
  }
  // 2. 再次确认≥4个点
  if (coords.length < 4) return 0;

  const polygon = turf.polygon([coords])
  return turf.area(polygon)
}
//分类完成之后计算这片区域的功能分布情况 区域结构 数量和面积  每次进来都是新计算 不会和之前的累计
export function regionStructure(buildingsWithCategory: buildingWithCategory[]) {
  const keys = ['commercial', 'accommodation', 'civic', 'transportation', 'unknown'] as const
  const amountFourType = Object.fromEntries(keys.map(k => [k + 'Amount', 0]))
  // fromEntries 是把  [["a","b"],["b",1]] 转换成 普通对象 {"a":"b","b":1}
  const eachAreaFourType = Object.fromEntries(keys.map(k => [k + 'EachArea', [] as EachArea[]]))
  //每种类型的总面积

  buildingsWithCategory.forEach(b => {
    const cat = b.category
    if (cat + "Amount" in amountFourType) {
      //数量++
      amountFourType[cat + "Amount"]++
      //面积入队
      const area = caculateArea(b.geometry)
      eachAreaFourType[cat + 'EachArea'].push({
        id: b.id,
        area: area,
        // geometry: b.geometry
      })
    }
  })
  return { amountFourType, eachAreaFourType }
}

//查询OSMbuilding
interface chartData {
  value: number
  name: string
}
type chartDataArrType = Record<string, chartData[]>
type highlightMgrType = ReturnType<typeof createHighlightManager> | null


export async function queryOSM(lng: number, lat: number, radius: number, tuDingEntityId: string, chartDataArr: chartDataArrType, highlightMgr: highlightMgrType) {
  //把范围提供出去查找osm building建筑信息 
  /**
   * @param！不删除！我只是提供了一个范围 但目前我现在有多个圆圈需要重新查询 提供的圆圈半径不能只是一个了 经纬度坐标也是 所以当前这个函数只能查询一个 我还需要写一个新的批量查询的函数（接收lng[] lat[] radius(半径是统一的),tuDingEntityId[] 所有的都要传入） 
   * */
  const buildings = await getOSMBuilding(lng, lat, radius)
  //查询到建筑信息和id
  const { categoryIds, classifiedBuildings } = classifyBuildingsBatch(buildings)
  /* console.log('该范围建筑 classifiedBuildings', classifiedBuildings);
  console.log('该范围建筑Id categoryIds', categoryIds); */
  //数据处理 得到这篇区域的四类建筑分别有多少 以及面积
  const { amountFourType, eachAreaFourType } = regionStructure(classifiedBuildings)
  /* console.log("该范围四种类型的数量：", amountFourType)
  console.log("该范围四种类型建筑的单个面积：", eachAreaFourType) */
  // 第一次初始化 ，否则清空该数组 注意是用chartDataArr[tuDingEntityId] 而不是chartDataArr.tuDingEntityId
  if (!chartDataArr[tuDingEntityId]) {
    chartDataArr[tuDingEntityId] = []
  } else {
    chartDataArr[tuDingEntityId].length = 0
  }

  for (const key in amountFourType) {
    if (key === "commercialAmount") {
      chartDataArr[tuDingEntityId].push({ value: amountFourType[key], name: '商业类' })
    } else if (key === "accommodationAmount") {
      chartDataArr[tuDingEntityId].push({ value: amountFourType[key], name: '居住类' })
    } else if (key === "civicAmount") {
      chartDataArr[tuDingEntityId].push({ value: amountFourType[key], name: '公共设施' })
    } else if (key === "transportationAmount") {
      chartDataArr[tuDingEntityId].push({ value: amountFourType[key], name: '交通类' })
    } else {
      chartDataArr[tuDingEntityId].push({
        value: amountFourType[key], name: '未知'
      })
    }
  }
  // chartDataArr.push(chartData)
  //不要这样直接给响应式对象直接赋值 响应链会断掉
  // chartData = newData

  //各个圆圈的高亮管理是在高亮管理器ts文件中 只需要把图钉id和对应的建筑id传过去
  if (highlightMgr) {
    //高亮之前先初始化？
    // highlightMgr.clear()
    highlightMgr.setCategoryIds(tuDingEntityId, categoryIds)
  }
}
export function highlight() {

}
//半径动态变化的时候调用 watch
export function queryOSMBatch(tuDingEntityCollect: Record<string, { lng: number, lat: number }>, radius: number, chartDataArr: chartDataArrType, highlightMgr: highlightMgrType) {
  // 把lng lat entityId拆出来
  // 对象没有foreach
  Object.keys(tuDingEntityCollect).forEach(async (tuDingEntityId) => {
    // console.log('key, tuDingEntityCollect[tuDingEntityId].lng,tuDingEntityCollect[key].lat', tuDingEntityId, tuDingEntityCollect[tuDingEntityId].lng, tuDingEntityCollect[tuDingEntityId].lat);
    await queryOSM(tuDingEntityCollect[tuDingEntityId].lng, tuDingEntityCollect[tuDingEntityId].lat, radius, tuDingEntityId, chartDataArr, highlightMgr)
  })
}
