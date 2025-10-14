import * as Cesium from 'cesium'
import { AnimationService } from './AnimationService'
import { PointService } from './PointService'
import { PathService } from './PathService'
import { OrderStore } from '../db/OrderStore'
// import { pathUtils } from '../utils/pathUtils'
import { saveCameraPos, removeCameraListener, setCameraPosition } from '@/utils/aboutCamera'
import type { CombinedOrder, SegmentType, DeliveryOrder } from '../interface'
import { ref } from 'vue'
import { getSequOrders } from '../utils/sequOrders'
import { registerServices, clearServices } from './GlobalServices'
import { useOrderStore } from '@/views/rightPanel/top/store/orderStore'

export class SceneStateManager {
  private viewer: Cesium.Viewer
  private animationService: AnimationService | null = null
  private pointService: PointService | null = null
  private pathService: PathService | null = null
  private isCameraListen = ref(false) //不是响应式对象吗

  private orders: DeliveryOrder[] | null = null
  private combinedOrder: CombinedOrder | null = null
  private orderStepSegments: Record<string, SegmentType[]> | null = null
  private order0StartIso: string | null = null
  //  '2025-10-09T12:30:00+08:00'

  private saveRiderPosOri: () => void = () => { }
  private saveTime: () => void = () => { }
  private savePopupState: () => void = () => { }

  private setTimeOutNumber: number | null = null

  private orderStorePinia = useOrderStore()

  //全局状态驱动
  private globalStatusInterval: number | null = null


  //第二步 保存当前订单集时间段 骑手id 骑手索引
  //存本地 combinedorder-control
  // 默认值：合法 JSON
  private DEFAULT_CONTROL = {
    currentTimeslot: '12',
    currentRegion: '九龙城区',
    currentRiderIdx: 0
  }

  private combinedorderControl = JSON.parse(localStorage.getItem('combinedorderControl') || JSON.stringify(this.DEFAULT_CONTROL))
  private currentTimeslot: number = this.combinedorderControl.currentTimeslot
  private currentRegion: string = this.combinedorderControl.currentRegion
  private currentRiderIdx: number = this.combinedorderControl.currentRiderIdx

  private ridersIds: string[] = []

  //订单轮询interval
  private intervalNumber: number | null = null

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  //第三步：根据时间段 和 区域 加载骑手数据
  public async loadRiderDataByRegionTime(region: string, timeslot: number) {
    const orderStore = new OrderStore()

    const riderids_combined = await orderStore.getRiderIdsByRegionTimeslot(region, timeslot)
    if (riderids_combined.length === 0) {
      console.log('获取组合订单的key失败')
    }

    this.currentTimeslot = timeslot
    this.currentRegion = region

    Object.assign(this.combinedorderControl, {
      currentTimeslot: timeslot,
      currentRegion: region,
    })

    localStorage.setItem('combinedorderControl', JSON.stringify(this.combinedorderControl))

    this.ridersIds = riderids_combined

    //加载第一个骑手的数据 !!切换订单的话这里要同步数据
    await this.loadRiderData(region, timeslot, this.ridersIds[this.currentRiderIdx])

    //初始化 : 服务 相机监听 回显
    await this.initialize()
    //启动全局计时器
    // this.startGlobalStatusTimer()
    //开始订单轮询 定时调用 switchRider
    const riderPosOri = JSON.parse(localStorage.getItem('riderPosOri') || 'null')
    if (!riderPosOri) { //刷新之后本地没有存储需要回显的数据的话 开启轮询
      if (this.intervalNumber) return
      this.intervalNumber = setInterval(async () => {
        await this.switchRider()
      }, 5000);
    }
  }


  //清除轮询定时器
  public clearInterval() {
    if (this.intervalNumber)
      clearInterval(this.intervalNumber)
  }

  //第四步：点击切换骑手(也就是切换订单)
  public async switchRider() {
    if (this.ridersIds.length === 0) {
      console.log('没有骑手ids，无法切换')
      return
    }

    this.currentRiderIdx = (this.currentRiderIdx + 1) % this.ridersIds.length //可以一直累+1 不用关心会不会超出骑手总数
    Object.assign(this.combinedorderControl, {
      currentRiderIdx: this.currentRiderIdx
    })
    localStorage.setItem('combinedorderControl', JSON.stringify(this.combinedorderControl))

    const currentId = this.ridersIds[this.currentRiderIdx]
    //清除上一个骑手的数据
    this.clear()//全局定时器已关闭

    const timeslot = this.currentTimeslot

    //加载骑手的数据
    await this.loadRiderData(this.currentRegion, timeslot, currentId)

    //初始化 : 服务 相机监听 回显
    await this.initialize()

    //订单状态重置
    this.resetOrderControlStatus()
    //再次开启全局定时器
    // this.startGlobalStatusTimer()
  }

  public resetOrderControlStatus() {
    this.orderStorePinia.resetStatus()
  }

  async initialize() {
    // 初始化服务 orders必须有值
    this.initServices()

    //启用相机监听
    //照相机位置监听
    saveCameraPos(this.viewer, this.isCameraListen)
    this.isCameraListen.value = true //已经开始监听

    // 注册 beforeunload 同步保存
    //骑手位置和方向同步保存
    this.saveRiderPosOri = () => {
      if (this.pathService) {
        localStorage.setItem('riderPosOri', JSON.stringify({ riderPos: this.pathService.getRiderPos(), riderOri: this.pathService.getRiderOri() }))
      } else {
        console.warn('this.pathService未初始化，无法保存骑手位置和朝向')
      }
    }

    //骑手运动时间同步保存
    this.saveTime = () => {
      const elapsed = Cesium.JulianDate.secondsDifference(this.viewer.clock.currentTime, this.viewer.clock.startTime)
      localStorage.setItem('lastElapsed', JSON.stringify(elapsed))
      // localStorage.setItem('globalStatusElaped', JSON.stringify(elapsed)) //给到订单状态更新 ? 

    }
    //弹窗状态同步保存 收集所有弹窗状态
    this.savePopupState = () => {
      localStorage.setItem('popupShowState', JSON.stringify(this.pointService!.getPopupState()))
    }

    //开启监听
    window.addEventListener('beforeunload', this.saveRiderPosOri)
    window.addEventListener('beforeunload', this.saveTime)
    window.addEventListener('beforeunload', this.savePopupState)

    // 如果有路径数据 则执行回显逻辑
    if (JSON.parse(localStorage.getItem('isPath') || 'false')) {
      await this.restoreScene()
    }

  }


  /**
   * 
   * @param orderStore 管理数据的类
   * @param region 区域
   * @param timeslot 时间点
   * @param riderId 组合订单的id e.g. rider_9bv9_combined 
   */
  private async loadRiderData(region: string, timeslot: number, riderId: string) {
    //根据区域、时间、骑手 获取组合订单、stepSegement并赋值给全局
    const orderStore = new OrderStore()
    const comOrSeg = await orderStore.getCombinedOrderById(region, timeslot, riderId)
    if (!comOrSeg) return
    this.combinedOrder = comOrSeg.combinedOrder
    this.orderStepSegments = comOrSeg.orderStepSegments
    const timeIso = comOrSeg.startTimeIso

    /* const Tsplit = timeIso.toString().split('T')[1]
    T12:00:00+08:00
    console.warn('时间要手动修复 localForage里存储的时间不对 原本是存储 `T12:00:00+08:00` 但是现在变成 Fri Oct 10 2025 11:57:17 GMT12:00:00+08:00 修复之后是:', `2025-10-09T${Tsplit}`) */

    const fmt = (d = new Date()) => { // 2025-10-09
      const z = n => (n < 10 ? '0' : '') + n;
      return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
    }
    const today = fmt() // 2025-10-09


    this.order0StartIso = `${today}${timeIso}`

    //准备 排好序的订单 SequOrders
    const orders: DeliveryOrder[] = await orderStore.getOrdersByCombinedOrder(region, timeslot, comOrSeg.combinedOrder)

    const sequOrders = await getSequOrders(orders, comOrSeg.combinedOrder) //订单按照取餐顺序排序
    this.orders = sequOrders

    // orders 和 combinedOrder 存入pinia 订单面板展示
    this.orderStorePinia.saveSequOrders(sequOrders)
    this.orderStorePinia.saveCombinedOrder(comOrSeg.combinedOrder)
    this.orderStorePinia.initOrders() //有数据之后立马初始化面板

  }

  /* public startGlobalStatusTimer() {
    if (this.globalStatusInterval) clearInterval(this.globalStatusInterval)

    if (!this.animationService || !this.combinedOrder || !this.orderStepSegments) {
      console.log('this.animationService', this.animationService)
      console.log('this.combinedOrder', this.combinedOrder)
      console.log('this.orderStepSegments', this.orderStepSegments)
      console.log('以上没有准备好 不能开启全局定时器')
      return
    }
    this.animationService.setAnimationData(this.combinedOrder, this.orderStepSegments)

    let elapsed = JSON.parse(localStorage.getItem('globalStatusElaped') || '0') // 刷新之后用这个 //切换订单之后这个就清零还是其他的订单复用呢? 复用 但是跑到终点之后所有订单都是已送达状态? 
    this.globalStatusInterval = setInterval(() => {
      //到终点之后就 定时器不要继续运行
      localStorage.setItem('globalStatusElaped', JSON.stringify(elapsed))
      if (this.animationService) {
        const cumDistance = this.animationService.updateOrderStatusByElapsed(elapsed)
        
        if (this.combinedOrder && cumDistance >= this.combinedOrder?.distance) {
          console.log('到达终点停止') //用距离判断?
          this.stopGlobalStatusTimer()
        }
        elapsed += 50
      } else {
        console.log('AnimationService 还没有初始化, 导致面板订单状态无法更新')
      }

    }, 1000);

  }

  public stopGlobalStatusTimer() {
    if (this.globalStatusInterval) {
      clearInterval(this.globalStatusInterval)
      this.globalStatusInterval = null
    }
  } */

  public initServices() {
    //初始化服务
    this.pathService = new PathService(this.viewer)
    this.animationService = new AnimationService(this.viewer, this.pathService)

    if (this.orders)
      this.pointService = new PointService(this.viewer, this.orders)
    if (this.pointService)
      //注册到全局
      registerServices({
        pathService: this.pathService,
        animationService: this.animationService,
        pointService: this.pointService
      })
  }

  private restoreScene = async () => {
    if (!this.pointService || !this.pathService || !this.animationService) return

    // 点位回显
    await this.pointService.drawCombinedStops()

    //获取照相机位置 设置照相机位置
    const cameraPos = JSON.parse(localStorage.getItem('cameraBeforeReload') || '{}')
    if (cameraPos) {
      setCameraPosition(this.viewer, cameraPos.destination, cameraPos.orientation)
    }

    // 获取骑手位置
    const riderPosOri = JSON.parse(localStorage.getItem('riderPosOri') || '{}')
    if (riderPosOri) {
      this.pathService.recreatRiderModel(riderPosOri.riderPos, riderPosOri.riderOri)
    }
    //路径数据设置 
    if (!this.combinedOrder || !this.orderStepSegments || !this.order0StartIso) return

    this.animationService.setAnimationData(this.combinedOrder, this.orderStepSegments)
    // 开始动画
    this.animationService.startAnimation(this.combinedOrder.duration, this.order0StartIso)

    // 新增： 读取上次保存的进度时间（s）  //延迟回显骑手的进度
    let lastElapsed = JSON.parse(localStorage.getItem('lastElapsed') || '0') //读取订单面板的时间

    lastElapsed = Math.max(0, lastElapsed - 20)

    this.setTimeOutNumber = setTimeout(() => { //过一会在更新骑手位置
      this.animationService?.seekToTime(lastElapsed, true)
    }, 20)

    //弹窗回显 获取弹窗状态
    const popupShowState = JSON.parse(localStorage.getItem('popupShowState') || '{}')

    this.pointService.reshowPopup(popupShowState)

    //面板数据回显
    //加载
  }

  public clear() {
    if (!this.pointService || !this.pathService || !this.animationService) return

    this.animationService.destroy() //销毁动画服务
    this.pointService.clear() //清除弹窗、图钉图标
    //确保动画服务在路径服务之前销毁
    this.pathService.cleanup()

    // 清除轨迹线、骑手实体


    //轨迹绘制标识清除
    localStorage.setItem('isPath', 'false')

    removeCameraListener(this.isCameraListen)

    //清除实例
    this.pathService = null
    this.pointService = null
    this.animationService = null

    //全局服务中也销毁
    clearServices()

    window.removeEventListener('beforeunload', this.saveRiderPosOri)
    window.removeEventListener('beforeunload', this.saveTime)
    window.removeEventListener('beforeunload', this.savePopupState)

    localStorage.removeItem('riderPosOri')
    localStorage.removeItem('popupShowState')
    localStorage.removeItem('lastElapsed')
    localStorage.removeItem('secondLastCurrentSegs')

    //清除延时器
    if (this.setTimeOutNumber)
      clearTimeout(this.setTimeOutNumber)

    //关闭全局计时器
    // this.stopGlobalStatusTimer()
  }

  public getServices() {
    return {
      animationService: this.animationService,
      pathService: this.pathService,
      pointService: this.pointService
    }
  }

  public getData() {
    return {
      // combinedOrders: this.combinedOrders,
      orderStepSegments: this.orderStepSegments,
      combinedOrder: this.combinedOrder,
      order0StartIso: this.order0StartIso  //`2025-10-09T12:00:00+08:00`
    }
  }

}