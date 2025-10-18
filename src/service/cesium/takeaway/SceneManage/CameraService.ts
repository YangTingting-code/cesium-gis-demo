//步骤 2：新建 CameraService.ts（封装事件监听 + beforeunload）

//把 addEventListener/removeEventListener 和相机保存/恢复从管理器里挪出来，统一启停，避免遗忘清理。

import * as Cesium from 'cesium'
import { saveCameraPos, removeCameraListener, setCameraPosition } from '@/utils/aboutCamera'
import { ScenePersistence } from './ScenePersistence'
import { type Ref, ref } from 'vue'

type SaveFns = {
  getRiderPos: () => any,
  getRiderOri: () => any,
  getPopupState: () => any,
  getClockElapsed: () => any //相当于之前SceneStateManage的saveTime函数 lastElapsed
}

export class CameraService {
  private viewer: Cesium.Viewer
  private isListening: Ref<boolean> = ref(false)
  private boundBeforeUnload?: () => void //这个是做什么用的?

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  start(saveFns: SaveFns) {
    if (this.isListening.value === true) return

    // 1)相机位置监听
    saveCameraPos(this.viewer, this.isListening)
    this.isListening.value = true

    // 2) beforeunload: 统一保存会话状态 
    this.boundBeforeUnload = () => {
      //2.1保存骑手位置和朝向
      ScenePersistence.setRiderPosOri({
        riderPos: saveFns.getRiderPos(),
        riderOri: saveFns.getRiderOri()
      })
      //2.2 保存当前的时间差
      ScenePersistence.setLastElapsed(saveFns.getClockElapsed())
      //2.3 保存弹窗状态
      ScenePersistence.setPopupShowState(saveFns.getPopupState())

    }
    window.addEventListener('beforeunload', this.boundBeforeUnload)
  }

  restore() {
    //相机位置回显
    const cameraPos = ScenePersistence.getCameraBeforeReload()
    setCameraPosition(this.viewer, cameraPos.destination, cameraPos.orientation)
  }

  stop() {
    //移除相机监听
    removeCameraListener(this.isListening)

    //移除beforeunload
    if (this.boundBeforeUnload) {
      window.removeEventListener('beforeunload', this.boundBeforeUnload)
      this.boundBeforeUnload = undefined
    }
  }

}