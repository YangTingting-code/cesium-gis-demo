<template>
  <!-- <searchStore class="searchStore"/> -->
  <el-row>
    <el-col :span="5" class="search-control ml-3" @click="toggleList">
      <div class="grid-content">搜索附近商铺</div>
      <!-- 事件委托 -->
      <div v-if="showList" class="search" @click.stop="selectMethod">
        <div class="search-list">
          <!-- 还有其他搜索方法的话可以循环生成 -->
          <div class="item" data-method="circle">
            <div class="searchPic">
              <button>图片</button>
              <span>圆圈搜索</span>
            </div>
          </div>
        </div>
      </div>
      <div 
        v-if="showControl"
        class="control-panel" 
        @click.stop="controlClick"
      >
        <span class="slider-title">搜索半径</span>
        <div class="slider-demo-block">
          <el-slider
            v-model="radius"
            :min="10"
            :max="300"
            :step="10"
            show-input
          />
        </div>
        <div class="button-row">
          <el-button type="primary" round :disabled="isStartDisabled">开始搜索</el-button>
          <!-- <el-button type="success" round :disabled="!isStartDisabled" @click="stopSearch">
            停止搜索
          </el-button> -->
          <el-button type="success" round :disabled="!isStartDisabled" @click="open">停止搜索</el-button>
        </div>
      </div>
    </el-col>
    <el-col :span="5">
      <div class="grid-content">ceshi</div>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import * as Cesium from 'cesium';
import { clickScreenGetPoint,removeCircle,searchCircles } from './action/clickGetPoint'
import { ElMessage, ElMessageBox } from 'element-plus'

//搜索功能面板的显隐
const showList = ref(false)
//控制面板的显隐
const showControl = ref(false)
//滑块半径的默认值
const radius = ref(100)
//按钮是否启用
const isStartDisabled = ref(false)
function toggleList() {
  showList.value = !showList.value
}

//子组件接收父组件
const props = defineProps<{
  viewerRef: Cesium.Viewer;
  tilesetRef: Cesium.Cesium3DTileset;
}>();

function selectMethod(e: MouseEvent) {
  const item = (e.target as HTMLElement).closest('.item')
  if (!item) return
  toggleList()
  if (item.dataset.method === 'circle'){
    if (props.viewerRef && props.tilesetRef) {
      showControl.value = !showControl.value
    }
  } 
}

//准备接收当前的圆圈实例
function controlClick(e:MouseEvent){
  // console.log("点击了控制面板");
  const btn = (e.target as HTMLElement).closest('button')
  if(!btn) return 
  console.log('jinll');
  isStartDisabled.value = true
  //开始绘制圆形并查询
  clickScreenGetPoint(props.viewerRef, props.tilesetRef,radius)
}
//方法一：watch监听滑块值 实时更新圆圈半径 
/* watch(radius,(newValue)=>{
  currentCircleArr.value?.map(circle=>{
    circle.ellipse!.semiMajorAxis = new Cesium.ConstantProperty(newValue)
    circle.ellipse!.semiMinorAxis = new Cesium.ConstantProperty(newValue)
  })
}) */

function stopSearch(){
  //清除之前搞一个对话框提示用户确认是否删除 确认就清空 取消就终止
  Object.keys(searchCircles).forEach(entityId=>{
    removeCircle(props.viewerRef,entityId)
  })
}

const open = () => {
  ElMessageBox.confirm(
    'proxy will permanently delete the file. Continue?',
    'Warning',
    {
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      type: 'warning',
    }
  )
    .then(() => {
      ElMessage({
        type: 'success',
        message: 'Delete completed',
      })
      stopSearch()
    })
    .catch(() => {
      ElMessage({
        type: 'info',
        message: 'Delete canceled',
      })
    })
}

</script>

<style lang="scss">
.el-row {
  position: absolute;
  width: 50%;
  z-index: 10;
  margin-bottom: 20px;
}

.el-row:last-child {
  margin-bottom: 0;
}

.el-col {
  border-radius: 4px;
  margin-right: 15px;
  margin-top: 7px;
}

.grid-content {
  color: white;
  background-color: rgba(57, 147, 138, 0.75);
  outline: 1px solid rgba(0, 255, 255, 0.8);
  text-align: center;
  border-radius: 4px;
  min-height: 36px;
  line-height: 34px;
  cursor: pointer;
}

.search {
  position: absolute;
  top: 50px;
  left: 14px;
  width: 180px;
  height: 180px;
  background-color: rgba(38, 38, 38, 0.75);
  border-radius: 5px;
  padding: 10px;
  .search-list {
    display: flex;
    flex-wrap: wrap;
    .item {
      //active时btn和文字样式不一样
      &.active {
        button {
          border: double 4px rgb(189, 236, 248);
        }
        span {
          color: rgb(189, 236, 248);
        }
      }
      display: flex;
      justify-content: center;
      align-items: top;
      margin-bottom: 1px;
      width: 60px;
      height: 90px;
      // background-color: pink;
      flex-wrap: wrap;
      text-align: center;
      cursor: pointer;
      button {
        width: 60px;
        height: 60px;
        // background-image: url('../assets/mapboxLayersPic/mapbox-navigation-night.png');
        background-size: cover;
        border-radius: 5px;
        border: 2px solid transparent;
        transition: all 0.2s ease;
      }
      &:hover button {
        border-color: #fff; // 白色边框
        box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.8); // 白色发光描边
        background-color: rgba(255, 255, 255, 0.1); // 可选浅背景增强层次
      }
      // 关键部分：当 button hover，span 添加下划线
      &:hover span {
        text-decoration: underline;
      }
      span {
        font-size: 12px;
        color: white;
        position: relative;
        top: -3px;
      }
    }
  }
}
.control-panel{
  position: relative;
  margin-top: 8px;
  padding: 5px;
  width: 410px;
  height: 130px;
  background-color: rgba(99, 208, 187, 0.582);
  border-radius: 5px;

  /* 让面板本身不再拦截鼠标 */
  pointer-events: none;
  .slider-title{
    color: white;
    margin-left: 5px;
    font-size: 20px;
  }
  .slider-demo-block {
    max-width: 400px;
    display: flex;
    align-items: center;
    /* 再把滑块区域的事件恢复 */
    pointer-events: auto;
    .custom-slider{
      margin-top: 0;
      margin-left: 12px;
      .el-slider {
        margin-top: 0;
        margin-left: 12px;
      }
    }
  }
  .button-row {
    margin-top: 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content:space-around ;
    align-items: center;
    pointer-events: auto;   /* 按钮也需要点击 */
    & > * {
      margin: 0;
    }
  }

}
</style>
