import type { Category } from '@/interface/globalInterface';
import { createHighlightManager } from '../../utils/manageOSMHighlight';
import { Cesium3DTileset } from 'cesium';

export class Visualizer {
  private highlight;
  constructor(tileset: Cesium3DTileset) {
    this.highlight = createHighlightManager(tileset);
  }
  highlightBuilding(
    pinEntityId: string,
    categoryIds: Record<Category, number[]>
  ) {
    this.highlight.setCategoryIds(pinEntityId, categoryIds);
  }
  clearHighLightById(pinEntityId: string) {
    this.highlight.removeCategoryIds(pinEntityId);
  }
  clearAll() {
    this.highlight.removeAllCategories();
  }
  destroy() {}
}
