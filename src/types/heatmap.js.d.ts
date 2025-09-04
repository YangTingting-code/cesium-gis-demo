declare module 'heatmap.js' {
  export interface HeatmapConfiguration {
    container: HTMLElement;
    radius?: number;
    maxOpacity?: number;
    minOpacity?: number;
    blur?: number;
    gradient?: Record<number, string>;
    data?: {
      max: number;
      data: Array<{ x: number; y: number; value: number; radius?: number }>;
    };
  }

  export interface HeatmapInstance {
    setData(data: HeatmapConfiguration['data']): void;
    addData(
      data: Array<{ x: number; y: number; value: number; radius?: number }>
    ): void;
    repaint(): void;
    getDataURL(): string;
  }

  interface HeatmapFactory {
    create(config: HeatmapConfiguration): HeatmapInstance;
  }

  const h337: HeatmapFactory;
  export default h337;
}
