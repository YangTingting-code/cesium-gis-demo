<template>
  <!-- <searchStore class="searchStore"/> -->
  <el-row>
    <el-col
      :span="5"
      class="search-control ml-3"
      @click="toggleList"
    >
      <div class="grid-content">
        搜索附近商铺
      </div>
      <!-- 事件委托 -->
      <div
        v-if="showList"
        class="search"
        @click.stop="selectMethod"
      >
        <div class="search-list">
          <!-- 还有其他搜索方法的话可以循环生成 -->
          <div
            class="item"
            data-method="circle"
          >
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
          <!-- 事件委托控制按钮的点击 -->
          <el-button
            type="primary"
            round
            :disabled="isStartDisabled"
            class="start"
          >
            开始搜索
          </el-button>
          <el-button
            type="success"
            round
            :disabled="isStopDisabled"
            class="stop"
          >
            停止搜索
          </el-button>
        </div>
      </div>
    </el-col>
    <el-col :span="5">
      <div class="grid-content">
        ceshi
      </div>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import * as Cesium from 'cesium';
import {
  init,
  clickScreenGetPoint,
  removeCircle,
  unClickScreenGetPoint,
  isPopup,
} from './raw/clickGetPoint';
import { ElMessage, ElMessageBox } from 'element-plus';

//搜索功能面板的显隐
const showList = ref(false);
//控制面板的显隐
const showControl = ref(false);
//滑块半径的默认值
const defaultRadius = 100;
const radius = ref(defaultRadius);
//按钮是否启用 初始的时候是可以使用的状态
const isStartDisabled = ref(false);
//当弹窗出现的时候按钮才可以用 初始的时候是不能使用的状态
const isStopDisabled = ref(true);
//标识当前是否是圆圈搜索
const isCircleSearch = ref(false);

//弹窗还没有出来就停止搜索 会无法彻底清除搜索圈 如何当弹窗出来的时候才能点击搜索圆？解决方案从clickGetPoint中拿到一个标志旗isPopup
//isPopup 当前是否有弹窗 注意不要用watch监听整个searchCircles
watch(isPopup, (newVal) => {
  console.log('isPopup', newVal);
  //如果当前没有弹窗 那么isPopup.value是false 此时按钮不能被开启
  isStopDisabled.value = !isPopup.value;
});

function toggleList() {
  console.log('showControl', showControl.value);

  if (showControl.value === false) {
    showList.value = !showList.value;
    console.log('showControl', showControl.value);
  }
}

//子组件接收父组件
const props = defineProps<{
  viewerRef: Cesium.Viewer;
  tilesetRef: Cesium.Cesium3DTileset;
}>();

onMounted(() => {
  let hasChartData = false;
  const searchDataManage = JSON.parse(
    localStorage.getItem('searchDataManage') || '{}'
  );
  if (Object.keys(searchDataManage).length > 0) {
    //如果searchDataManage有存储东西
    hasChartData = true; //说明存储了数据
    showControl.value = true; //如果当前chartDataManage有存储东西的话，说明是用户刷新网页没有想要删除 此时控制面板需要可见
    //按钮状态呢？ 开始搜索 按钮不可点击 停止搜索按钮可以点击
    isStartDisabled.value = true;
    //半径更新 radius.value更新数据 响应式链没有断 滑块半径和圆圈半径一致，所以说当半径变化的时候searchDataManage的半径需要跟着更新 更新key 迁移key
    const fisrtKey = Object.keys(searchDataManage)[0];
    const r = fisrtKey.split(',')[1];
    radius.value = +r;
  }
  init(props.viewerRef, hasChartData, props.tilesetRef, radius, isCircleSearch); //调用getClickPoint.ts中的初始化函数
});

function selectMethod(e: MouseEvent) {
  const item = (e.target as HTMLElement).closest('.item');
  if (!item) return;
  toggleList();
  if (item.dataset.method === 'circle') {
    if (props.viewerRef && props.tilesetRef) {
      isCircleSearch.value = true;
      showControl.value = !showControl.value;
    }
  }
}

// 事件委托 管理点击事件
function controlClick(e: MouseEvent) {
  // console.log("点击了控制面板");
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  // console.log('btn',btn);
  if (btn.className.includes('start')) {
    //点击之后就不能在被点击 现在把他弄成不可被点击
    isStartDisabled.value = true;
    //既然是点击开始绘制 那么说明还没有调用过这个函数
    //开始绘制圆形并查询
    clickScreenGetPoint(props.viewerRef, props.tilesetRef, radius, ref(false));
  } else if (btn.className.includes('stop')) {
    //停止搜索
    //移除屏幕监听事件和清除所有圆圈
    stopAndDelete();
  }
}

function clearCircles() {
  //清除之前搞一个对话框提示用户确认是否删除 确认就清空 取消就终止
  const searchDataManage = JSON.parse(
    localStorage.getItem('searchDataManage') || '{}'
  );
  if (Object.keys(searchDataManage).length === 0) {
    console.log('不需要清除画布上的圆圈，直接切换按钮显示');
  } else {
    //开始循环移除圆圈
    Object.keys(searchDataManage).forEach((key) => {
      const entityId = key.split(',')[0]; //注意这个key 是 entityId + radius组成的
      removeCircle(props.viewerRef, entityId);
    });
  }
}
// const isPopup = ref(false)
function stopAndDelete() {
  ElMessageBox.confirm('将永久清除所有搜索圈，继续吗？', '警告', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      ElMessage({
        type: 'success',
        message: '已全部清除',
        offset: 105,
      });
      //移除搜索圈和建筑恢复默认样式
      clearCircles();
      //让开始搜索按键可以被点击
      isStartDisabled.value = !isStartDisabled.value;
      //让停止搜索按键不可以被点击
      isStopDisabled.value = !isStopDisabled.value;
      //移除监听事件
      unClickScreenGetPoint();
      //面板不可见
      showControl.value = !showControl.value;
      //滑块半径值恢复成默认
      radius.value = defaultRadius;
      //当前不再是圆圈搜索状态
      isCircleSearch.value = false;
    })
    .catch(() => {
      ElMessage({
        type: 'info',
        message: '取消清除',
        offset: 105,
      });
    });
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
.control-panel {
  position: relative;
  margin-top: 8px;
  padding: 5px;
  width: 410px;
  height: 130px;
  background-color: rgba(99, 208, 187, 0.582);
  border-radius: 5px;

  /* 让面板本身不再拦截鼠标 */
  pointer-events: none;
  .slider-title {
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
    .custom-slider {
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
    justify-content: space-around;
    align-items: center;
    pointer-events: auto; /* 按钮也需要点击 */
    & > * {
      margin: 0;
    }
  }
}
</style>
