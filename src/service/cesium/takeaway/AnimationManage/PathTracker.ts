//PathTracker 是“路径状态协调者”，PathService 是“路径执行者”。
import type { SegmentType, CombinedOrder } from '@/views/cesium/toolbar/takeaway/interface'
import { type PathService } from '@/views/cesium/toolbar/takeaway/service/PathService'
import { useBucketStore } from '@/views/cesium/toolbar/takeaway/store/bucketStore'

export class PathTracker {
  private pathService
  private currentSegs: number[] = []
  private lastCurrentSegs: number[] = []
  private isDataReload: boolean = false
  private cumD: number = 0
  private hasSetCamera = false

  private bucketStore = useBucketStore()

  constructor(pathService: PathService) {
    this.pathService = pathService
  }

  public setPathData(order: CombinedOrder, perStepSegments: Record<string, SegmentType[]>) {
    this.pathService.setPathData(order, perStepSegments)
  }

  public isSetCamera() {
    if (localStorage.getItem('isPath') === 'false' && !this.hasSetCamera) {
      this.pathService.setCameraByRiderPosOri()
      this.hasSetCamera = true
    }
  }


  public updateFrame(isBack: boolean) {
    const buckets = this.pathService.updateSegmentsType(this.cumD, isBack)

    if (buckets) {

      this.pathService.applySegmentBuckets(buckets)

      this.bucketStore.updateBuckets(buckets)

      if (buckets.currentSegs.length > 0) {
        this.lastCurrentSegs = buckets.currentSegs
      }

      if (buckets.currentSegs.length === 0 && this.lastCurrentSegs) { //不要数据回显的时候存入undefined lastCurrentSegs 污染了
        if (JSON.parse(localStorage.getItem('secondLastCurrentSegs') || '[]').length > 0) return //如果已经存过就不要再存 切换订单的时候再清除
        localStorage.setItem('secondLastCurrentSegs', JSON.stringify(this.lastCurrentSegs))
      }

      if (buckets.currentSegs?.length) {
        if (buckets.currentSegs.length > 0)
          this.currentSegs = buckets.currentSegs
      }
    }

    if (this.currentSegs.length > 0) {
      //更新动态线位置
      this.pathService.updatePathProgressByDistance(this.cumD, this.currentSegs, this.isDataReload)
    }

    // return buckets
  }

  public updateRiderPosition(deltaSeconds: number, isDataReload: boolean) {
    const cumD = this.pathService.updateRiderByDuration(deltaSeconds, this.currentSegs, isDataReload)
    this.isDataReload = isDataReload
    return cumD
  }

  public getCumDistance(elapsed: number) {
    this.cumD = this.pathService.getCumDistance(elapsed)
    return this.cumD
  }


  public reset() { //在清除的时候重置
    this.currentSegs = []
    this.lastCurrentSegs = []
    this.cumD = 0
    this.isDataReload = false
    this.hasSetCamera = false
  }
}