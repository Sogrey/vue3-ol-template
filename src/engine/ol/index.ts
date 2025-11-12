/**
 * index.ts
 * OpenLayers 引擎核心类
 * @author Sogrey
 * @date 2025-11-13 00:00:00
 * @lastModify 2025-11-13 01:09:00
 * @version 1.0.0
 */

import * as Utils from './utils.ts'
import Map from 'ol/Map.js';
import View from 'ol/View.js';

/**
 * OLEngine
 * OpenLayers 地图引擎单例类
 * 提供地图初始化、销毁和状态管理功能
 * @example
 * ```typescript
 * // 初始化地图
 * const engine = OLEngine.getInstance();
 * engine.init('map-container');
 *
 * // 使用地图实例
 * const map = engine.map;
 * if (map) {
 *   // 地图操作
 * }
 *
 * // 销毁地图
 * engine.destroy();
 * ```
 */
export default class OLEngine {
  private static instance: OLEngine | null = null

  /**
   * 地图实例引用
   * 存储当前活跃的地图对象
   */
  private _map: Map | null = null

  /**
   * 私有构造函数
   * 防止外部实例化，确保单例模式
   */
  private constructor() {
    // 私有构造函数防止外部实例化
  }

  /**
   * 获取单例实例
   * 返回唯一的 OLEngine 实例
   * @return {OLEngine} 返回单例实例
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance();
   * ```
   */
  static getInstance(): OLEngine {
    if (!OLEngine.instance) {
      OLEngine.instance = new OLEngine()
    }
    return OLEngine.instance
  }

  /**
   * 获取地图实例
   * 返回当前的地图实例，如果未初始化则返回 null
   * @return {Map | null} 返回地图实例或 null
   * @example
   * ```typescript
   * const map = engine.map;
   * if (map) {
   *   // 操作地图
   * }
   * ```
   */
  get map(): Map | null {
    if (!this._map) {
      console.warn('OpenLayers地图尚未初始化，请先调用init方法')
      return null
    }
    return this._map
  }

  /**
   * 初始化地图
   * 创建并配置 OpenLayers 地图实例
   * @param {string} eleId - 地图容器的 DOM 元素 ID
   * @param {OLMapOptions} [options] - 可选的地图配置选项
   * @example
   * ```typescript
   * // 基本初始化
   * engine.init('map-container');
   *
   * // 带自定义配置初始化
   * engine.init('map-container', {
   *   view: new View({
   *     center: [116.4, 39.9],
   *     zoom: 10
   *   })
   * });
   * ```
   */
  init(eleId: string, options?: OLMapOptions) {
    const mergedOptions = {
      target: eleId,
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),

      ...options
    }

    this._map = new Map(mergedOptions)

    console.log(this._map)
    console.log(Utils.uuid('Sogrey'))
  }

  /**
   * 销毁地图
   * 释放地图资源并重置状态
   * @example
   * ```typescript
   * // 销毁地图实例
   * engine.destroy();
   * ```
   */
  destroy() {
    if (this._map) {
      this._map.dispose()
      this._map = null
    }
  }

  /**
   * 检查地图是否已初始化
   * 返回地图的初始化状态
   * @return {boolean} 返回 true 表示已初始化，false 表示未初始化
   * @example
   * ```typescript
   * if (engine.isInit()) {
   *   // 地图已初始化，可以安全操作
   * }
   * ```
   */
  isInit() {
    return this._map !== null
  }

}
