import * as Cesium from 'cesium'
import type { DeliveryOrder, SegmentType, Milestone } from '../interface'
import { useBucketStore } from '../store/bucketStore'
import { useOrderStore } from '@/views/rightPanel/top/store/orderStore'
import { toRaw } from 'vue'
export class AnimationService {
  private viewer: Cesium.Viewer
  private pathService: any
  private isAnimating: boolean
  private startTime: Cesium.JulianDate | null
  private duration: number
  private globalProgress: number
  private clockListener: any
  private stepSegments: any | null
  private order0: DeliveryOrder | null = null
  private orders: DeliveryOrder[] = []
  private currentOrderIndex = 0
  private currentSegs: number[] = []
  private bucketStore = useBucketStore()
  private orderStore = useOrderStore()
  //节流检查骑手是否到送餐点
  // private throttleCheckDelivery: (progress: number) => void
  // 里程碑累计距离判断骑手是否到达
  private lastMilestoneIndex = 0
  private lastCumDistance = 0 //用于 “跨越检测” 时钟倍速太高容易漏掉某些订单的更新

  private destroyed = false //销毁锁 
  private lastCurrentSegs

  constructor(viewer: Cesium.Viewer, pathService: any) {
    this.viewer = viewer
    this.pathService = pathService
    this.isAnimating = false
    this.startTime = null
    this.duration = 0
    this.globalProgress = 0
    this.clockListener = null

    /* this.throttleCheckDelivery = throttle((progress: number) => {
      if (progress > 0.99) { //0.99 接近于1
        const riderLngLat = this.getRiderLngLat() as [number, number]
        this.orderStore.checkDelivery(riderLngLat)
      }
    }, 1000) */

  }

  /**
   * 设置动画数据
   * @param orders 订单数据数组
   * @param stepSegments 路径分段数据
   */
  public setAnimationData(order: DeliveryOrder, perStepSegments: Record<string, SegmentType[]>) {
    this.order0 = order
    this.stepSegments = perStepSegments
    this.duration = order.duration
    this.pathService.setPathData(order, perStepSegments)

  }


  /**
   * 开始路径动画
   * @param {number} duration - 动画总时长（秒）
   * @param {string} startTimeISO - 开始时间ISO字符串
   */
  public startAnimation(duration: number, startTimeISO: string) {
    if (this.isAnimating) {
      console.warn('动画已在运行中')
      return
    }
    if (!this.order0 || !this.stepSegments) {
      console.error('动画数据未设置，请先调用 setAnimationData()')
      return
    }

    this.duration = duration
    this.isAnimating = true
    this.globalProgress = 0
    // 设置Cesium时钟
    this.setupClock(startTimeISO, duration)

    //自动飞到骑手附近 第一次创建的时候飞过去 数据回显阶段不要飞过去
    //但问题是切换订单之后 isPath 状态什么样? 
    if (localStorage.getItem('isPath') === 'false') {
      this.pathService.setCameraByRiderPosOri()
    }

    // 开始动画循环
    this.startPreciseAnimationLoop()
  }

  /**
   * 使用精确计算的动画循环
   */
  private startPreciseAnimationLoop() {
    //如果是数据回显状态 使用上一次保存的时间
    let useLastElapsed = false
    let lastElapsed: number
    const isPath = JSON.parse(localStorage.getItem('isPath') || 'false')

    if (isPath) {
      useLastElapsed = true
      lastElapsed = JSON.parse(localStorage.getItem('lastElapsed') || '0')
    }

    //在onTick回调之前用 销毁锁 判断是否已执行过销毁逻辑 
    if (this.destroyed) return

    this.clockListener = this.viewer.clock.onTick.addEventListener((clock) => {

      if (this.destroyed) return

      if (!clock.shouldAnimate || !this.isAnimating) return

      const elapsed = useLastElapsed ? lastElapsed : Cesium.JulianDate.secondsDifference(clock.currentTime, clock.startTime)
      useLastElapsed = false

      // 使用精确算法 计算骑手当前累计距离 
      const cumDistance = this.pathService.getCumDistance(elapsed)
      const isBack = this.lastCumDistance > cumDistance //上一次的距离大于这一次的距离 说明时间倒流
      // 新增：根据骑手位置更新订单状态 
      this.checkMilestoneProgress(cumDistance, isBack)

      //新增：根据当前累加距离给当前路径分类并创建primitive 未开始 正在进行 已完成
      const buckets = this.pathService.updateSegmentsType(cumDistance, isBack)

      if (buckets) {
        console.log('buckets', buckets)
        // debugger
        this.pathService.applySegmentBuckets(buckets)

        this.bucketStore.updateBuckets(buckets)
        if (buckets.currentSegs.length > 0) {
          this.lastCurrentSegs = buckets.currentSegs
        }

        if (buckets.currentSegs.length === 0 && this.lastCurrentSegs) { //不要数据回显的时候存入undefined lastCurrentSegs 污染了
          localStorage.setItem('secondLastCurrentSegs', JSON.stringify(this.lastCurrentSegs))
        }

        if (buckets.currentSegs?.length) {
          if (buckets.currentSegs.length > 0)
            this.currentSegs = buckets.currentSegs
        }
      }
      if (this.currentSegs.length > 0) {
        //更新动态线位置
        this.pathService.updatePathProgressByDistance(cumDistance, this.currentSegs)

      }


      // 修复：使用订单总距离计算进度
      if (this.order0 && this.order0.distance > 0) {
        //这里也要改 不用改 正整条路径
        this.globalProgress = Math.min(cumDistance / this.order0.distance, 1.0)
      }
      // 触发进度更新事件 为什么要有这个函数？ 更新进度回调 添加自定义的进度处理逻辑
      this.onProgressUpdate(this.globalProgress, cumDistance, elapsed)

      // 检查动画是否完成
      if (this.shouldStopAnimation(elapsed, cumDistance)) {
        //保存订单的duration到本地
        // if (this.order0)
        //   localStorage.setItem('lastElapsed', JSON.stringify(this.order0?.duration))
        this.stopAnimation()
        this.onAnimationComplete()
      }
    })
  }

  /**
   * 全局 this.lastCumDistance 保存骑手上一帧的累计距离 
   * 这个函数是遍历剩下的里程碑 检索到落在上一帧到这一帧距离之间的里程碑  根据里程碑更新订单状态
   * @param riderCumDistance 骑手当前帧的累计距离
   */
  private checkMilestoneProgress(riderCumDistance: number, isBack: boolean) {
    const combinedOrder = this.orderStore.getCombinedOrder()
    const milestones = combinedOrder.milestones
    const DIST_TOLERANCE = 5

    const prevDistance = this.lastCumDistance
    const nextDistance = riderCumDistance
    // const isBack = prevDistance > riderCumDistance //如果之前距离大于现在的距离 那么就是true 否则是false
    if (isBack) {
      //遍历之前的里程碑
      for (let i = this.lastMilestoneIndex; i > 0; i--) {
        const current = milestones[i]
        if (nextDistance <= current.cumDistance &&
          prevDistance > current.cumDistance
        ) {
          this.lastMilestoneIndex = i - 1
          this.updateOrderStatus(current, isBack)
        }
      }
    } else {
      //这个循环是从上一次触发的里程碑开始 遍历后面所有的里程碑 依次检查
      for (let i = this.lastMilestoneIndex + 1; i < milestones.length; i++) { //骑手出生点不算
        const current = milestones[i]
        // const prevDistance = this.lastCumDistance
        // const nextDistance = riderCumDistance

        //只要骑手从上次距离跨越了当前里程碑，就触发
        if (current.cumDistance >= prevDistance - DIST_TOLERANCE &&
          current.cumDistance <= nextDistance + DIST_TOLERANCE
        ) {
          this.lastMilestoneIndex = i
          this.updateOrderStatus(current, isBack)
        }
      }
    }



    //最后更新记录
    // 放在循环外：确保每帧检查“上一帧到当前帧”区间内跨越的所有里程碑，不漏检
    this.lastCumDistance = riderCumDistance //为什么不是写在if语句？  因为写在if里面起不到跨越检测的效果 写在里面的话上一帧的距离被立马更新成骑手当前距离 ，问题是骑手上一帧到这一帧之间跨越的距离很长(因为倍速变大 时间差变大 骑手距离变大),距离很长跨越了多个送货点 导致部分送货点会漏掉更新  写在外面就是把所有剩下的里程碑(送货点)都检查过一边  这样就不会漏
  }

  //更新订单状态 判断出来里程碑切换
  private updateOrderStatus(milestone: Milestone, isBack: boolean) {
    const orderId = milestone.orderId
    if (!orderId) return
    const statusMapKey = this.orderStore.getStatusKeyById(orderId)
    if (!statusMapKey) return

    if (statusMapKey) {
      if (isBack) {
        if (milestone.type === 'pickup') {
          this.orderStore.setStatusByKey(statusMapKey, '赶往商家')
        } else if (milestone.type === 'dropoff') {
          this.orderStore.setStatusByKey(statusMapKey, '配送中')
        }
      } else {
        if (milestone.type === 'pickup') {
          this.orderStore.setStatusByKey(statusMapKey, '配送中')
        } else if (milestone.type === 'dropoff') {
          this.orderStore.setStatusByKey(statusMapKey, '已送达')
        }
      }
    }
  }

  //根据骑手位置更新订单状态
  /*   private getRiderLngLat() {
      const posC3 = this.pathService.getRiderPos()
      const radianLngLat = Cesium.Cartographic.fromCartesian(posC3) //经纬度 但是是弧度的
      const riderLngLat = [Cesium.Math.toDegrees(radianLngLat.longitude), Cesium.Math.toDegrees(radianLngLat.latitude)]
      return riderLngLat
    } */



  // (progress:number)=>{
  //   if (currentProgress > 0.99) { //0.99 接近于1
  //     const riderLngLat = this.getRiderLngLat() as [number, number]
  //     this.orderStore.checkDelivery(riderLngLat)
  //   }
  // }

  /**
   * 判断是否应该停止动画
   */
  private shouldStopAnimation(elapsed: number, cumDistance: number): boolean {
    // 条件1：时间超过总时长
    if (elapsed >= this.duration) {
      return true
    }

    // 条件2：进度接近完成（考虑浮点数精度）
    if (this.globalProgress >= 1 - 1e-6) {
      return true
    }

    // 条件3：距离超过总距离（考虑测量误差）
    if (this.order0 && cumDistance >= this.order0.distance - 0.01
      // * 0.999
    ) {
      return true
    }

    return false
  }

  /**
   * 设置Cesium时钟
   */
  private setupClock(startTimeISO: string, duration: number) {
    const clock = this.viewer.clock
    const startTime = Cesium.JulianDate.fromIso8601(startTimeISO)
    const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate())

    clock.startTime = startTime.clone()
    clock.currentTime = startTime.clone()
    clock.stopTime = stopTime
    clock.clockRange = Cesium.ClockRange.CLAMPED
    clock.multiplier = 10 // 可以配置化
    clock.shouldAnimate = true

    this.startTime = startTime
    this.viewer.timeline.zoomTo(startTime, stopTime)
  }

  /**
   * 暂停动画
   */
  pauseAnimation() {
    // if (this.isAnimating) {
    this.viewer.clock.shouldAnimate = false
    // this.isAnimating = false
    console.log('动画已暂停')
    // }
  }

  /**
   * 继续动画
   */
  resumeAnimation() {
    // if (!this.isAnimating && this.startTime) {
    this.viewer.clock.shouldAnimate = true
    // this.isAnimating = true
    console.log('动画继续')
    // }
  }

  /**
   * 停止动画 移除clock监听
   */
  stopAnimation() {
    // this.isAnimating = false
    this.viewer.clock.shouldAnimate = false

    // if (this.clockListener) {
    // this.viewer.clock.onTick.removeEventListener(this.clockListener)
    // this.clockListener = null
    // }

    console.log('动画已停止')

  }
  removeClockListener() {
    this.stopAnimation()
    if (this.clockListener) {
      this.viewer.clock.onTick.removeEventListener(this.clockListener)
      this.clockListener = null
    }
    console.log('时钟监听已移除')
  }

  /**
   * 重置动画到开始状态
   */
  resetAnimation() {
    this.stopAnimation()
    this.globalProgress = 0

    if (this.startTime) {
      this.viewer.clock.currentTime = this.startTime.clone()
    }

    // 重置骑手位置到起点
    this.pathService.updateRiderByDuration(0)

    console.log('动画已重置')
  }

  /**
   * 跳转到指定时间点
   * @param targetTime 目标时间（秒）
   */
  seekToTime(targetTime: number, isDataReload: boolean) {
    if (!this.startTime) return

    const clampedTime = Math.max(0, Math.min(targetTime, this.duration))

    //需要把时钟映射到对应的时间才行
    const newTime = Cesium.JulianDate.addSeconds(
      this.startTime,
      clampedTime,
      new Cesium.JulianDate()
    )

    this.viewer.clock.currentTime = newTime

    // 更新骑手位置和进度
    const cumDistance = this.pathService.updateRiderByDuration(clampedTime, this.currentSegs, isDataReload)

    if (this.order0 && this.order0.distance > 0) {
      this.globalProgress = Math.min(cumDistance / this.order0.distance, 1.0)

    }

    console.log('跳转到时间:', clampedTime, '秒，进度:', this.globalProgress)
  }

  /**
   * 跳转到指定进度
   * @param progress 进度值 0-1
   */
  seekToProgress(progress: number) {
    const targetTime = progress * this.duration
    this.seekToTime(targetTime, false)
  }

  /**
   * 设置动画速度
   * @param multiplier 速度倍数（1=正常速度，10=10倍速度）
   */
  setAnimationSpeed(multiplier: number) {
    this.viewer.clock.multiplier = Math.max(0.1, multiplier)
    console.log('动画速度设置为:', multiplier, '倍')
  }

  /**
  * 获取当前动画状态
  */
  getAnimationState() {
    return {
      // isAnimating: this.isAnimating,
      globalProgress: this.globalProgress,
      elapsedTime: this.startTime ?
        Cesium.JulianDate.secondsDifference(this.viewer.clock.currentTime, this.startTime) : 0,
      totalDuration: this.duration,
      animationSpeed: this.viewer.clock.multiplier
    }
  }

  /**
   * 进度更新回调（可以被子类重写或通过事件监听）
   */
  protected onProgressUpdate(progress: number, distance: number, elapsedTime: number) {
    // 可以在这里添加自定义的进度处理逻辑
    // 例如：更新UI进度条、触发自定义事件等
  }

  /**
   * 动画完成回调
   */
  protected onAnimationComplete() {
    console.log('骑手动画完成！')
    // 可以在这里添加动画完成后的处理逻辑
    // 例如：显示完成提示、自动开始下一个动画等
  }

  /**
   * 销毁服务，清理资源
   */
  destroy() {
    this.destroyed = true
    this.stopAnimation()
    this.removeClockListener()
    this.order0 = null
    this.stepSegments = null
    this.startTime = null
    console.log('AnimationService 已销毁')
  }
}
