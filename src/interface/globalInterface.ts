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
  coords: Array<number>,
  osmId: number,
  tags: Record<string, string>
}
