import { OrderStore } from '@/views/cesium/toolbar/takeaway/db/OrderStore'

const orderStore = new OrderStore()

export async function getCurrentCombinedData() {
  const combinedorderData = JSON.parse(localStorage.getItem('combinedorderControl') || '{}')
  const region = combinedorderData.currentRegion
  const timeslot = combinedorderData.currentTimeslot
  const riderIdx = combinedorderData.currentRiderIdx
  const riderIds = await orderStore.getRiderIdsByRegionTimeslot(region, timeslot) //带combined的
  const riderId_combined = riderIds[riderIdx]
  const combinedOrder = await orderStore.getCombinedOrderById(region, timeslot, riderId_combined)
  console.log('combinedOrder', combinedOrder)
  debugger
  // await timeslotData.getItem
}