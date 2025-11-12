<template>
  <div id="map"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, } from 'vue'

import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';

import OLEngine from '@/engine/ol'

// 获取引擎实例
const engine = OLEngine.getInstance()

onMounted(() => {

  // 初始化地图
  engine.init('map', {
    view: new View({
      center: [104.0635986160487, 30.660919181071225],
      zoom: 5,
      minZoom: 1,
      maxZoom: 20,
      projection: "EPSG:4326"
    }),
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
    ],
  })

  // 获取地图实例
  const map = engine.map
  if (map) {
    // 地图操作
  }

})

onUnmounted(() => {
  // 销毁地图
  engine.destroy()
})
</script>

<style lang="less" scoped>
#map {
  width: 100%;
  height: 100%;
}
</style>
