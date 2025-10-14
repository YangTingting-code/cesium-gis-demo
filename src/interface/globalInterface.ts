//定义类型
export interface Point {
  0: number; //lng
  1: number; //lat
}
export type Position = [number, number]; // [lng, lat]pp
export type LinearRing = Position[]; // 闭合环
export type PolygonCoor = LinearRing[]; // 一个 Polygon（外环+可选内环）
export type MultiPolygon = PolygonCoor[]; //多个Polygon
export interface MultiPolygonFeature {
  geometry: {
    coordinates: MultiPolygon;
    type: 'MultiPolygon';
  };
  properties: Record<string, unknown>;
  type: 'Feature';
}

export interface PointFeature {
  geometry: {
    coordinates: Position;
    type: 'Point';
  };
  properties: unknown;
  type: 'Feature';
}
//osm 建筑类型 overpass api 查找得到的
export interface building {
  coords: Array<number>;
  osmId: number;
  tags: Record<string, string>;
}

//建筑结构
export interface FunctionNode {
  id: number;
  type: 'shop' | 'amenity' | 'office';
  subtype: string; // shop=* / amenity=* / office=*
  lat: number;
  lng: number;
  tag: Record<string, unknown>;
}

export interface BuildingProfile {
  id: number; // OSM id
  buildingType: string; // building tag
  geometry: Array<{ lat: number; lng: number }>;
  functionNodes: FunctionNode[];
  tag: Record<string, unknown>;
  commercialScore?: number; // 可选：商业活跃度
  bbox: { maxlat: number; maxlon: number; minlat: number; minlon: number }; // 边界盒
}

/**  osm缓存数据结构设计 */
type CenterKey = string; // "lng,lat"
interface CenterRecord {
  pinEntityId: string;
  radius: number;
  data: BuildingProfile[];
}
export interface CenterCache {
  [centerKey: CenterKey]: CenterRecord;
}
//分类
export type Category =
  | 'commercial'
  | 'accommodation'
  | 'civic'
  | 'transportation';
export interface CategoryRules {
  building?: string[];
  shop?: string[];
  amenity?: string[];
  office?: string[];
}

export interface buildingWithCategory {
  id: number; // OSM id
  buildingType: string; // building tag
  geometry: Array<{ lat: number; lng: number }>;
  functionNodes: FunctionNode[];
  tag: Record<string, unknown>;
  commercialScore?: number; // 可选：商业活跃度
  category: Category | 'unknown';
}

// const searchDataArr: Record<string, searchDataType> = JSON.parse(localStorage.getItem('searchData') || '{}')
interface searchData {
  ids: {
    pointEntityId: string;
    circleEntityId: string;
    popupId: string;
  };
  position: {
    lng: number;
    lat: number;
    h: number;
  };
}
// key =  pinEntityId + radius 字符串 用existCenter 看是否已经缓存过该中心点 , Obj {Ids:{pointEntityId circleEntityId popupId},position:{lng,lat}} 全局变量？
export type searchDataManageType = Record<string, searchData>;
