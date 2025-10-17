//用于三维底图和二维底图的同步
import { defineStore } from 'pinia'
import { getStyleUrlById } from '@/data/layersData'

export const useMapboxStyleStore = defineStore('mapboxStyleStore', {
  state: () => ({
    isUpdated: false, //监听这个变化 变化的话就拿当前的风格url
    mapboxStyleId: '' as string
  }),

  actions: {
    updateId(mapboxStyleId: string) {
      this.mapboxStyleId = mapboxStyleId
      this.isUpdated = !this.isUpdated
    },
    getCurrentMapboxStyleId(): string | null {
      if (!this.mapboxStyleId) {
        console.log('底图风格还没有准备好')
        return null
      }
      return getStyleUrlById[this.mapboxStyleId]
    },
    getMapboxStyleId() {
      return this.mapboxStyleId
    }
  }
})