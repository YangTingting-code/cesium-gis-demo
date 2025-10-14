<template>
  <h1>人流环比图</h1>
  <chart />
</template>

<script setup lang="ts">
  import {test} from './getPerData'
  import { onMounted } from 'vue' 
  import chart from "./HeatFlowCompare.vue";
  onMounted(async ()=>{
    try{
      await test()
    }catch(err){
      console.log(err);
    }
  })

</script>

<style lang="scss">

</style>