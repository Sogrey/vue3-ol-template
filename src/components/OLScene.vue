<template>
  <div id="map"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, } from 'vue'
import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import TileWMS from 'ol/source/TileWMS.js';
import View from 'ol/View.js';

let map: Map

onMounted(() => {
  map = new Map({
    target: 'map',
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
    ],
    view: new View({
      center: [0, 0],
      zoom: 2,
    }),
  });

  // const map = new Map({
  //   target: 'map',
  //   view: new View({
  //     projection: 'EPSG:3857', // here is the view projection
  //     center: [0, 0],
  //     zoom: 2,
  //   }),
  //   layers: [
  //     new TileLayer({
  //       source: new TileWMS({
  //         projection: 'EPSG:4326', // here is the source projection
  //         url: 'https://ahocevar.com/geoserver/wms',
  //         params: {
  //           'LAYERS': 'ne:NE1_HR_LC_SR_W_DR',
  //         },
  //       }),
  //     }),
  //   ],
  // });

  // map.on('postrender', function (event) {
  //   const viewState = event.frameState?.viewState;
  //   console.log(viewState?.projection)

  //   console.log(map)
  // })
})

onUnmounted(() => {
  map.dispose()
})
</script>

<style lang="less" scoped>
#map {
  width: 100%;
  height: 100%;
}
</style>
