import { defineStore } from 'pinia'
import type { SceneStateManager } from '../service/SceneStateManager'

let _manager: SceneStateManager | null = null

export const useSceneStore = defineStore('sceneManager', {
  state: () => ({
    isReady: false
  }),
  actions: {
    setManager(manager: SceneStateManager) {
      _manager = manager
      this.isReady = true
    },

    getManager() {
      return _manager
    }
  }
})