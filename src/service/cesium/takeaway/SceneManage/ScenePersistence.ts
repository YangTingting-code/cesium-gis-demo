//步骤 1：新建 ScenePersistence.ts（封装 localStorage）
//把所有 localStorage.get/set/remove 集中起来，行为不变，调用点简化。

type Json = any //这是什么? 返回任意

//读取
const read = (key: string): Json => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
//写
const write = (key: string, value: Json) => {
  localStorage.setItem(key, JSON.stringify(value))
}
//删除
const del = (key: string) => {
  localStorage.removeItem(key)
}

export const ScenePersistence = {

  //骑手位置和朝向
  getRiderPosOri() {
    return read('riderPosOri')
  },
  setRiderPosOri(val: Json) {
    write('riderPosOri', val)
  },
  removeRiderOri() {
    del('riderPosOri')
  },

  //时钟差
  getLastElapsed() {
    return read('lastElapsed')
  },
  setLastElapsed(val: Json) {
    write('lastElapsed', val)
  },
  removeLastElapsed() {
    del('lastElapsed')
  },


  //是否绘制骑手路径中
  getIsPath() {
    return read('isPath')
  },
  setIsPath(value: Json) {
    write('isPath', value)
  },


  //弹窗
  getPopupShowState() {
    return read('popupShowState')
  },
  setPopupShowState(val: Json) {
    write('popupShowState', val)
  },
  removePopupShowState() {
    del('popupShowState')
  },

  //相机
  getCameraBeforeReload() {
    return read('cameraBeforeReload')
  },
  setCameraBeforeReload(val: Json) {
    write('cameraBeforeReload', val)
  },
  removeCameraBeforeReload() {
    del('cameraBeforeReload')
  },

  //订单控制面板
  getCombinedorderControl() {
    return read('combinedorderControl')
  },
  setCombinedorderControl(val: Json) {
    write('combinedorderControl', val)
  },
  removeCombinedorderControl() {
    del('combinedorderControl')
  },

  clearSessionKeys() {
    del('riderPosOri')
    del('popupShowState')
    del('lastElapsed')
    del('secondLastCurrentSegs')
  }

}