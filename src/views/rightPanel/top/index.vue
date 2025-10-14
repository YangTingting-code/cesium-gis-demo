<template>
  <div class="combinedOrder">
    <div class="head">
      <span>骑手订单</span>
    </div>
    <div class="body">
      <div
        v-for="(value,key) in ordersInfo"
        :key='key'
        class="order"
      >
        <span class="number">{{key}}</span>
  
        <div
          class="content"
        >
          <div class="start">
            <span>取餐点：</span>
            <div class="address">
              {{ value['取餐点'].name +"，"+ value['取餐点'].street +"，"+value['取餐点'].housenumber}}
            </div>
          </div>
          <div class="end">
            <span>送餐点：</span>
            <div class="address">
              {{ value['送餐点'].name +"，"+ value['送餐点'].description}}
            </div>
          </div>
        </div>

        <div class="status">
          <span>{{ orderStatusMap[key] }}</span>
        </div>
      </div>
    </div>
    <div class="foot">
      <div class="rider-info">
        <div class="rider-name">
          <span>骑手姓名：<span>馋嘴猫</span></span>
        </div>
        <div class="rider-phone">
          <span>骑手电话：<a>13526259796</a></span>
        </div>
      </div>
      <div class="select">
        <label for="timeslot">选择订单时间段</label>
        <select id="timeslot" v-model="currentSlotKey">
          <option value="morning">7点-10点</option>
          <option value="lunch">10点-14点</option>
          <option value="afternoon">14点-17点</option>
          <option value="dusk">17点-20点</option>
          <option value="night">20点-24点</option>
        </select>
      </div>
      <button @click="changeOrder"> 
        查看其他订单
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, onUnmounted, ref, watch} from 'vue'
import {useOrderStore} from './store/orderStore'

import {useSceneStore} from '@/views/cesium/toolbar/takeaway/store/sceneStore'
import {OrderStore} from '@/views/cesium/toolbar/takeaway/db/OrderStore'

import type {SceneStateManager} from '@/views/cesium/toolbar/takeaway/service/SceneStateManager'

const orderStorePinia = useOrderStore()

const ordersInfo = ref(orderStorePinia.getOrdersInfo()) //第x单: 取餐点：{name address} 送餐点：

const orderStatusMap = orderStorePinia.getStatusMap()
//用户不点击也自己播放 跑时间？

// 第一步 订单面板时间映射到数字
const timeslot2number: Record<string, number> = {
    'morning': 9,
    'lunch': 12,
    'afternoon': 16,
    'dusk': 18,
    'night': 22
  }
const timeslot2slotkey: Record<number, string> = {
  9:'morning',
  12:'lunch',
  16:'afternoon',
  18:'dusk',
  22:'night'
}

const DEFAULT_CONTROL = {
  currentTimeslot: '12',
  currentRegion: '九龙城区',
  currentRiderIdx: 0
}
const combinedorderControl = JSON.parse(localStorage.getItem('combinedorderControl') || JSON.stringify(DEFAULT_CONTROL))

  //根据本地数据决定select里面的内容？？
const localTimeslot:number = combinedorderControl.currentTimeslot
const currentSlotKey = ref(timeslot2slotkey[localTimeslot]) //默认选择10-14点

//不接收 viewer 创建新的状态管理实例 因为在 takeaway/index.vue里面也会创建一个新的状态管理实例 两个数据不共享 不要重新创建
// 用 pinia 管理 但是不要直接把状态管理实例存成响应式的 会卡到爆炸 存成普通变量 用一个旗帜做标记 获取实例需要watch 那个旗帜 旗帜变化且变为true的时候说明 状态实例已存入 此时外界可以获取
const sceneStore = useSceneStore()
let sceneManager :SceneStateManager | null
watch(()=>sceneStore.isReady,async (ready)=>{
  if(ready){
    sceneManager = sceneStore.getManager()
    if(sceneManager){
      const orderStore = new OrderStore()
      // const needDelete =await orderStore.checkCombinedSubKey('九龙城区',18)
      // console.log('收集到需要删除的needDelete', needDelete)

      // if(!needDelete) return
      // await orderStore.deleteCombinedData('九龙城区',18,needDelete)
      
      // await orderStore.deleteMatrixSlotKey('九龙城区','dusk')

      // await orderStore.prepareData(combinedorderControl.currentRegion,9,3)

      sceneManager.loadRiderDataByRegionTime(combinedorderControl.currentRegion,localTimeslot)
    }else{
      console.warn('SceneManager 仍为空')
    }
  }
},
{immediate:true}
)

//监听选择器的数据变化 加载其他时间段数据之前需要清除当前的轨迹
watch(currentSlotKey,async (newValue)=>{
  const timeslot = timeslot2number[newValue]
  
  if(sceneManager){
    sceneManager.clear()
    await sceneManager.loadRiderDataByRegionTime(combinedorderControl.currentRegion,timeslot)
  }
  
})

onMounted(()=>{

})

function changeOrder(){
  if(!sceneManager){
    console.log('此时状态管理实例还没有准备好')
    return
  }
  sceneManager.clearInterval() //取消轮询
  sceneManager.switchRider()
}

onUnmounted(()=>{
  //清除轮询定时器
  sceneManager?.clearInterval()
})



</script>

<style lang="scss" scoped>


.combinedOrder{
  width: 100%;
  height: 100%;
  border-radius: 0.6rem;
  padding: 0.5rem;

  background-color: rgba(0, 194, 255, 0.2);
  // border: 1px solid rgb(19, 244, 237);
  .head{
    display: flex;
    justify-content: space-around;
    align-items: center;
    text-align: center;
    color: rgb(251, 249, 249);
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 2px;

  }
  .body{
    height: 78%;
    background-color: palegoldenrod;
    color: black;
    .order{
      display: flex;
      align-items: center;
      padding: 0.3rem;
      height: 10vh;
      margin-bottom: 1rem;
      border: 1px solid purple;
      .number{
        display: flex;
        width:16px;
        writing-mode: vertical-rl;//主轴已变换成竖轴
        justify-content: center; //主轴方向居中
        align-items: center; //侧轴方向居中

        font-size: 1rem;
        height: 90%;
        background-color: rgb(19, 244, 237);
      }
      
      .content{
        width: 82%;
        margin-left: 5px;
        height: 90%;
        background-color: pink;
        span{
          display: inline-block;
          width: 20%;
          white-space:nowrap;
          background-color: yellow;
          margin-right: 0.5rem;
        }
        .start{
          // width: 75%;
          display: flex;
          // justify-content: center;
          align-items: center;
          background-color: rgb(88, 243, 88);
          height: 50%;
          
        }
        .end{
          // width: 75%;
          display: flex;
          // justify-content: center;
          align-items: center;
          background-color: rgb(88, 181, 243);
          height: 50%;
        }

      }

      .status{
        width: 8%;
        height: 90%;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: rgb(238, 156, 79);
        writing-mode: vertical-rl;
        margin-left: 5px;
      }
    }
  }
  .foot{
    
    background-color: palevioletred;
    height: 11%;
    display: flex;
    justify-content: space-around;
    align-items: center;
    flex-wrap: wrap;
    a{
      cursor: pointer;
    }
    .rider-info{
      display: flex;
      justify-content: space-around;
      width: 100%;
    }
    button{
      font-size: 1rem;
    }
    .select{
      display: flex;
      align-items: center;
      font-size: 1rem;
      font-weight: 400;
      select{
        font-size: 1rem;
        margin-left: 8px;
        width: 70px;
        height: 20px;
      
      }
    }
  }
}
</style>