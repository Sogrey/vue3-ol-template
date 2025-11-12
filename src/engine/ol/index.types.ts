/**
 * index.types.ts
 * OpenLayers 类型定义文件
 * @author Sogrey
 * @date 2025-06-01 00:00:00
 * @lastModify 2025-06-01 00:00:00
 * @version 1.0.0
 */

import View from 'ol/View.js';
import Layer from 'ol/layer/Layer.js';

declare global {

  /**
   * OLMapOptions
   * OpenLayers 地图配置选项接口
   * @example
   * ```typescript
   * const mapOptions: OLMapOptions = {
   *   target: 'map',
   *   view: new View({
   *     center: [0, 0],
   *     zoom: 2
   *   }),
   *   layers: [new TileLayer({ source: new OSM() })]
   * };
   * ```
   */
  interface OLMapOptions {

    /**
     * 地图容器的DOM元素ID
     * 用于指定地图渲染的目标容器
     * @example 'map-container' 或 'map'
     */
    target: string

    /**
     * 地图视图配置
     * 定义地图的显示中心、缩放级别等视图参数
     */
    view: View

    /**
     * 地图图层数组
     * 包含所有要显示在地图上的图层
     * @example [tileLayer, vectorLayer, markerLayer]
     */
    layers: Layer[]

  }

}

// 导出类型供直接导入使用
export type { OLMapOptions }

// 确保这是一个模块（有 import/export 语句）
export { }
