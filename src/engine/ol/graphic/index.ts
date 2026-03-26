import OLEngine from '..'

import Map from 'ol/Map.js'
import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import { Draw, Modify, Snap } from 'ol/interaction.js'
import { Geometry } from 'ol/geom.js'
import { Style, Fill, Stroke, Text, Icon as OLIcon, Circle as OLCircle } from 'ol/style.js'
import Feature from 'ol/Feature.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import type { Coordinate } from 'ol/coordinate.js'
import { Point, LineString, Polygon, Circle } from 'ol/geom.js'

/**
 * 图形类型枚举
 */
export enum GraphicType {
  /** 点 */
  Point = 'Point',
  /** 线 */
  LineString = 'LineString',
  /** 面 */
  Polygon = 'Polygon',
  /** 多点 */
  MultiPoint = 'MultiPoint',
  /** 多线 */
  MultiLineString = 'MultiLineString',
  /** 多面 */
  MultiPolygon = 'MultiPolygon',
  /** 圆 */
  Circle = 'Circle'
}

/**
 * 样式配置接口
 */
export interface StyleOptions {
  /** 填充颜色 */
  fillColor?: string
  /** 填充透明度 (0-1) */
  fillOpacity?: number
  /** 边框颜色 */
  strokeColor?: string
  /** 边框宽度 */
  strokeWidth?: number
  /** 边框透明度 (0-1) */
  strokeOpacity?: number
  /** 边框虚线样式 [dash, gap] */
  lineDash?: number[]
  /** 点半径 */
  radius?: number
  /** 图标路径 (仅点类型) */
  iconSrc?: string
  /** 图标缩放 (仅点类型) */
  iconScale?: number
  /** 图标锚点 [x, y]，默认 [0.5, 0.5] (仅点类型) */
  iconAnchor?: [number, number]
  /** 文本标签 */
  text?: string
  /** 文本字体 */
  fontFamily?: string
  /** 文本大小 */
  fontSize?: number
  /** 文本粗细 */
  fontWeight?: string
  /** 文本颜色 */
  textColor?: string
  /** 文本描边颜色 */
  textStrokeColor?: string
  /** 文本描边宽度 */
  textStrokeWidth?: number
  /** 文本水平对齐方式 */
  textAlign?: 'left' | 'center' | 'right' | 'start' | 'end'
  /** 文本垂直对齐方式 */
  textBaseline?: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'
  /** 文本偏移 [x, y] */
  textOffsetX?: number
  /** 文本 Y 轴偏移 */
  textOffsetY?: number
  /** 文本旋转角度 (弧度) */
  textRotation?: number
  /** 文本最大显示分辨率 */
  textMaxResolution?: number
}

/**
 * 绘制配置接口
 */
export interface DrawOptions extends StyleOptions {
  /** 图形类型 */
  type: GraphicType
  /** 是否可编辑 */
  editable?: boolean
  /** 是否吸附 */
  snap?: boolean
  /** 绘制完成回调 */
  onComplete?: (feature: Feature) => void
  /** 绘制中回调 */
  onDraw?: (feature: Feature) => void
  /** 图层名称，默认 'draw-layer' */
  layerName?: string
}

/**
 * 直接绘制配置接口
 */
export interface AddFeatureOptions extends StyleOptions {
  /** 图形类型 */
  type: GraphicType
  /** 顶点坐标 (经纬度) */
  coordinates: Coordinate | Coordinate[][] | Coordinate[][][] | Coordinate[][]
  /** 图层名称，默认 'draw-layer' */
  layerName?: string
  /** 要素属性 */
  properties?: Record<string, unknown>
}

/**
 * Graphic 模块类
 * 提供点、线、面的绘制和管理功能
 */
export default class Graphic {
  private engine: OLEngine

  /** 绘图图层集合 */
  private _layers: Record<string, VectorLayer<VectorSource>> = {}

  /** 当前绘制交互 */
  private _currentDraw: Draw | null = null

  /** 当前修改交互 */
  private _currentModify: Modify | null = null

  /** 当前吸附交互 */
  private _currentSnap: Snap | null = null

  constructor(engine: OLEngine) {
    this.engine = engine
  }

  /**
   * 获取地图实例
   */
  private get map(): Map | null {
    return this.engine.map
  }

  /**
   * 获取或创建图层
   * @param layerName 图层名称
   * @returns 图层实例
   */
  private _getOrCreateLayer(layerName: string): VectorLayer<VectorSource> {
    const map = this.map
    if (!map) throw new Error('地图未初始化')

    let layer = this._layers[layerName]

    if (!layer) {
      const source = new VectorSource()
      layer = new VectorLayer({
        source,
        zIndex: 100 // 确保在基础图层之上
      })
      layer.set('name', layerName)
      map.addLayer(layer)
      this._layers[layerName] = layer
    }

    return layer
  }

  /**
   * 创建样式对象
   * @param options 样式配置
   * @returns Style 实例
   */
  private _createStyle(options: StyleOptions): Style | undefined {
    const fillColor = options.fillColor ?? 'rgba(255, 0, 0, 1)'
    const fillOpacity = options.fillOpacity ?? 1
    const strokeColor = options.strokeColor ?? 'rgba(0, 0, 255, 1)'
    const strokeWidth = options.strokeWidth ?? 2
    const strokeOpacity = options.strokeOpacity ?? 1

    // 处理填充颜色透明度
    let fill: Fill | undefined
    if (fillColor) {
      if (fillColor.startsWith('rgba')) {
        fill = new Fill({ color: fillColor })
      } else {
        // 将 hex 颜色转换为 rgba
        const rgb = this._hexToRgb(fillColor)
        if (rgb) {
          fill = new Fill({
            color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fillOpacity})`
          })
        } else {
          fill = new Fill({ color: fillColor })
        }
      }
    }

    // 处理边框颜色透明度
    let stroke: Stroke | undefined
    if (strokeColor) {
      if (strokeColor.startsWith('rgba')) {
        stroke = new Stroke({
          color: strokeColor,
          width: strokeWidth,
          lineDash: options.lineDash
        })
      } else {
        const rgb = this._hexToRgb(strokeColor)
        if (rgb) {
          stroke = new Stroke({
            color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${strokeOpacity})`,
            width: strokeWidth,
            lineDash: options.lineDash
          })
        } else {
          stroke = new Stroke({
            color: strokeColor,
            width: strokeWidth,
            lineDash: options.lineDash
          })
        }
      }
    }

    // 创建图像样式（点类型）
    let image: OLCircle | OLIcon | undefined
    if (options.iconSrc) {
      image = new OLIcon({
        src: options.iconSrc,
        scale: options.iconScale ?? 1,
        anchor: options.iconAnchor ?? [0.5, 0.5]
      })
    } else if (options.radius !== undefined) {
      image = new OLCircle({
        radius: options.radius,
        fill,
        stroke
      })
    }

    // 创建文本样式
    let text: Text | undefined
    if (options.text) {
      const fontSize = options.fontSize ?? 14
      const fontFamily = options.fontFamily ?? 'Arial'
      const fontWeight = options.fontWeight ?? 'normal'
      const font = `${fontWeight} ${fontSize}px ${fontFamily}`

      const textColor = options.textColor ?? '#000000'
      const textStrokeColor = options.textStrokeColor ?? '#ffffff'
      const textStrokeWidth = options.textStrokeWidth ?? 2

      text = new Text({
        text: options.text ?? '',
        font,
        fill: new Fill({ color: textColor }),
        stroke: new Stroke({ color: textStrokeColor, width: textStrokeWidth }),
        textAlign: options.textAlign,
        textBaseline: options.textBaseline,
        offsetX: options.textOffsetX,
        offsetY: options.textOffsetY,
        rotation: options.textRotation
      })
    }

    return new Style({
      fill: image ? undefined : fill,
      stroke: image ? undefined : stroke,
      image,
      text
    })
  }

  /**
   * 坐标转换：经纬度 转 Web Mercator
   * @param coord 单个坐标
   * @returns 转换后的坐标
   */
  private _transformLonLatToWebMercator(coord: Coordinate): Coordinate {
    const lng = coord[0] ?? 0
    const lat = coord[1] ?? 0
    const x = (lng * 20037508.34) / 180
    const y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)
    const mercatorY = (y * 20037508.34) / 180
    return [x, mercatorY]
  }

  /**
   * 批量转换坐标
   * @param coordinates 坐标
   * @returns 转换后的坐标
   */
  private _transformCoordinates(
    coordinates: unknown
  ): Coordinate | Coordinate[][] | Coordinate[][][] | Coordinate[][][] {
    const transform = (coord: Coordinate) => this._transformLonLatToWebMercator(coord)

    // 判断类型并转换
    if (!Array.isArray(coordinates)) {
      throw new Error('坐标必须是数组')
    }

    const first = coordinates[0]
    if (first === undefined) {
      throw new Error('坐标数组为空')
    }

    // 判断第一个元素是否为数字数组（单个坐标）
    if (Array.isArray(first) && typeof first[0] === 'number') {
      return transform(coordinates as Coordinate)
    }

    // 判断第一个元素是否为数字数组的数组（线或坐标数组）
    if (Array.isArray(first) && Array.isArray(first[0]) && typeof first[0][0] === 'number') {
      return (coordinates as unknown as Coordinate[][]).map((coords) => transform(coords))
    }

    // 判断是否为面的嵌套数组
    if (
      Array.isArray(first) &&
      Array.isArray(first[0]) &&
      Array.isArray(first[0][0]) &&
      typeof first[0][0][0] === 'number'
    ) {
      return (coordinates as unknown as Coordinate[][][]).map((ring) =>
        ring.map((coord) => transform(coord))
      )
    }

    // 多面的情况
    return (coordinates as unknown as Coordinate[][][][]).map((polygon) =>
      polygon.map((ring) => ring.map((coord) => transform(coord)))
    )
  }

  /**
   * 颜色转换：Hex 转 RGB
   * @param hex Hex 颜色值
   * @returns RGB 对象
   */
  private _hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return null
    return {
      r: parseInt(result[1] || '0', 16),
      g: parseInt(result[2] || '0', 16),
      b: parseInt(result[3] || '0', 16)
    }
  }

  /**
   * 开始绘制图形（使用鼠标绘制）
   * @param options 绘制配置
   * @example
   * ```typescript
   * // 绘制点
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   * graphic.startDraw({
   *   type: GraphicType.Point,
   *   radius: 8,
   *   fillColor: '#ff0000',
   *   strokeColor: '#000000',
   *   strokeWidth: 2,
   *   onComplete: (feature) => {
   *     console.log('绘制完成', feature)
   *   }
   * })
   *
   * // 绘制线
   * graphic.startDraw({
   *   type: GraphicType.LineString,
   *   strokeColor: '#00ff00',
   *   strokeWidth: 3
   * })
   *
   * // 绘制面
   * graphic.startDraw({
   *   type: GraphicType.Polygon,
   *   fillColor: '#0000ff',
   *   fillOpacity: 0.5,
   *   strokeColor: '#000000',
   *   strokeWidth: 2
   * })
   *
   * // 绘制带标签的点
   * graphic.startDraw({
   *   type: GraphicType.Point,
   *   iconSrc: '/marker.png',
   *   iconScale: 0.5,
   *   text: '标签文字',
   *   textColor: '#ffffff',
   *   fontSize: 14
   * })
   * ```
   */
  startDraw(options: DrawOptions): void {
    const map = this.map
    if (!map) throw new Error('地图未初始化')

    // 停止当前绘制
    this.stopDraw()

    const layerName = options.layerName || 'draw-layer'
    const layer = this._getOrCreateLayer(layerName)

    // 创建绘制交互
    const draw = new Draw({
      source: layer.getSource()!,
      type: options.type
    })

    // 绘制完成事件
    draw.on('drawend', (event) => {
      const feature = event.feature
      if (feature) {
        // 设置样式
        const style = this._createStyle(options)
        feature.setStyle(style)

        if (options.onComplete) {
          options.onComplete(feature)
        }
      }
    })

    // 绘制中事件
    draw.on('drawabort', () => {
      if (options.onDraw) {
        // 获取当前正在绘制的要素
        const features = layer.getSource()?.getFeatures()
        if (features && features.length > 0) {
          const lastFeature = features[features.length - 1]
          if (lastFeature) {
            options.onDraw(lastFeature)
          }
        }
      }
    })

    map.addInteraction(draw)
    this._currentDraw = draw

    // 启用编辑
    if (options.editable) {
      this._currentModify = new Modify({
        source: layer.getSource()!
      })
      map.addInteraction(this._currentModify)
    }

    // 启用吸附
    if (options.snap !== false) {
      this._currentSnap = new Snap({
        source: layer.getSource()!
      })
      map.addInteraction(this._currentSnap)
    }
  }

  /**
   * 停止绘制
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   * graphic.stopDraw()
   * ```
   */
  stopDraw(): void {
    const map = this.map
    if (!map) return

    // 移除绘制交互
    if (this._currentDraw) {
      map.removeInteraction(this._currentDraw)
      this._currentDraw = null
    }

    // 移除修改交互
    if (this._currentModify) {
      map.removeInteraction(this._currentModify)
      this._currentModify = null
    }

    // 移除吸附交互
    if (this._currentSnap) {
      map.removeInteraction(this._currentSnap)
      this._currentSnap = null
    }
  }

  /**
   * 直接添加要素（通过坐标参数）
   * @param options 添加配置
   * @returns 创建的 Feature 实例
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * // 添加点
   * const pointFeature = graphic.addFeature({
   *   type: GraphicType.Point,
   *   coordinates: [116.4, 39.9],
   *   radius: 10,
   *   fillColor: '#ff0000',
   *   properties: { name: '北京', id: 1 }
   * })
   *
   * // 添加线
   * const lineFeature = graphic.addFeature({
   *   type: GraphicType.LineString,
   *   coordinates: [[116.4, 39.9], [116.5, 40.0], [116.6, 40.1]],
   *   strokeColor: '#00ff00',
   *   strokeWidth: 3
   * })
   *
   * // 添加面
   * const polygonFeature = graphic.addFeature({
   *   type: GraphicType.Polygon,
   *   coordinates: [[[116.4, 39.9], [116.5, 39.9], [116.5, 40.0], [116.4, 39.9]]],
   *   fillColor: '#0000ff',
   *   fillOpacity: 0.3,
   *   strokeColor: '#000000',
   *   strokeWidth: 2
   * })
   *
   * // 添加圆
   * const circleFeature = graphic.addFeature({
   *   type: GraphicType.Circle,
   *   coordinates: [[116.4, 39.9], [116.5, 39.9]],
   *   fillColor: '#ffff00',
   *   fillOpacity: 0.5,
   *   strokeWidth: 2
   * })
   * ```
   */
  addFeature(options: AddFeatureOptions): Feature {
    const map = this.map
    if (!map) throw new Error('地图未初始化')

    const layerName = options.layerName || 'draw-layer'
    const layer = this._getOrCreateLayer(layerName)

    // 转换坐标
    const coordinates = this._transformCoordinates(options.coordinates)

    // 创建几何对象
    let geometry: Geometry
    if (options.type === GraphicType.Circle) {
      // 圆形需要中心和边界
      const coords = coordinates as Coordinate[]
      if (!coords || coords.length < 2) {
        throw new Error('圆形需要至少两个坐标点（中心和边缘）')
      }
      const center = coords[0] ?? [0, 0]
      const edge = coords[1] ?? [0, 0]
      const radius = Math.sqrt(
        Math.pow(edge[0] - center[0], 2) + Math.pow(edge[1] - center[1], 2)
      )
      geometry = new Circle(center, radius)
    } else if (options.type === GraphicType.Point) {
      geometry = new Point(coordinates as unknown as Coordinate)
    } else if (options.type === GraphicType.LineString) {
      geometry = new LineString(coordinates as unknown as Coordinate[])
    } else if (options.type === GraphicType.Polygon) {
      geometry = new Polygon(coordinates as unknown as Coordinate[][])
    } else {
      // 对于其他类型，使用通用创建方式
      const coords = coordinates as unknown[]
      // 动态创建几何对象，使用 eslint-disable 跳过类型检查
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geometry = new (window as any).ol.geom[options.type](coords)
    }

    // 创建要素
    const feature = new Feature({
      geometry
    })

    // 设置属性
    if (options.properties) {
      Object.keys(options.properties).forEach((key) => {
        const value = options.properties![key]
        if (value !== undefined) {
          feature.set(key, value)
        }
      })
    }

    // 设置样式
    const style = this._createStyle(options)
    feature.setStyle(style)

    // 添加到图层
    layer.getSource()?.addFeature(feature)

    return feature
  }

  /**
   * 移除要素
   * @param feature 要素实例
   * @param layerName 图层名称，默认 'draw-layer'
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * // 添加要素
   * const feature = graphic.addFeature({
   *   type: GraphicType.Point,
   *   coordinates: [116.4, 39.9]
   * })
   *
   * // 移除要素
   * graphic.removeFeature(feature)
   * ```
   */
  removeFeature(feature: Feature, layerName: string = 'draw-layer'): void {
    const layer = this._layers[layerName]
    if (layer) {
      layer.getSource()?.removeFeature(feature)
    }
  }

  /**
   * 清空指定图层的所有要素
   * @param layerName 图层名称
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * // 清空默认图层
   * graphic.clear()
   *
   * // 清空指定图层
   * graphic.clear('custom-layer')
   * ```
   */
  clear(layerName: string = 'draw-layer'): void {
    const layer = this._layers[layerName]
    if (layer) {
      layer.getSource()?.clear()
    }
  }

  /**
   * 清空所有图层
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   * graphic.clearAll()
   * ```
   */
  clearAll(): void {
    Object.values(this._layers).forEach((layer) => {
      layer.getSource()?.clear()
    })
  }

  /**
   * 移除指定图层
   * @param layerName 图层名称
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * // 移除图层
   * graphic.removeLayer('custom-layer')
   * ```
   */
  removeLayer(layerName: string): void {
    const map = this.map
    if (!map) return

    const layer = this._layers[layerName]
    if (layer) {
      map.removeLayer(layer)
      delete this._layers[layerName]
    }
  }

  /**
   * 移除所有绘图图层
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   * graphic.removeAllLayers()
   * ```
   */
  removeAllLayers(): void {
    const map = this.map
    if (!map) return

    Object.values(this._layers).forEach((layer) => {
      map.removeLayer(layer)
    })

    Object.keys(this._layers).forEach((key) => {
      delete this._layers[key]
    })
  }

  /**
   * 获取指定图层的所有要素
   * @param layerName 图层名称
   * @returns 要素数组
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * const features = graphic.getFeatures('draw-layer')
   * console.log(`共有 ${features.length} 个要素`)
   * ```
   */
  getFeatures(layerName: string = 'draw-layer'): Feature[] {
    const layer = this._layers[layerName]
    return layer?.getSource()?.getFeatures() || []
  }

  /**
   * 导出指定图层为 GeoJSON
   * @param layerName 图层名称
   * @returns GeoJSON 字符串
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * const geojson = graphic.exportToGeoJSON('draw-layer')
   * console.log(geojson)
   * ```
   */
  exportToGeoJSON(layerName: string = 'draw-layer'): string {
    const features = this.getFeatures(layerName)
    const format = new GeoJSON()
    return JSON.stringify(format.writeFeatures(features, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    }))
  }

  /**
   * 从 GeoJSON 导入要素
   * @param geojson GeoJSON 字符串或对象
   * @param layerName 图层名称
   * @param styleOptions 样式配置
   * @returns 导入的要素数组
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * const geojson = {
   *   "type": "FeatureCollection",
   *   "features": [...]
   * }
   *
   * const features = graphic.importFromGeoJSON(geojson, 'import-layer', {
   *   fillColor: '#ff0000',
   *   strokeColor: '#000000',
   *   strokeWidth: 2
   * })
   *
   * console.log(`导入了 ${features.length} 个要素`)
   * ```
   */
  importFromGeoJSON(
    geojson: string | object,
    layerName: string = 'import-layer',
    styleOptions?: StyleOptions
  ): Feature[] {
    const map = this.map
    if (!map) throw new Error('地图未初始化')

    const layer = this._getOrCreateLayer(layerName)
    const format = new GeoJSON()

    const features = format.readFeatures(geojson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    })

    // 设置样式
    if (styleOptions) {
      const style = this._createStyle(styleOptions)
      features.forEach((feature) => feature.setStyle(style))
    }

    layer.getSource()?.addFeatures(features)

    return features
  }

  /**
   * 更新要素样式
   * @param feature 要素实例
   * @param styleOptions 样式配置
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * // 创建要素
   * const feature = graphic.addFeature({
   *   type: GraphicType.Point,
   *   coordinates: [116.4, 39.9],
   *   fillColor: '#ff0000'
   * })
   *
   * // 更新样式
   * graphic.updateStyle(feature, {
   *   fillColor: '#00ff00',
   *   radius: 15
   * })
   * ```
   */
  updateStyle(feature: Feature, styleOptions: StyleOptions): void {
    const style = this._createStyle(styleOptions)
    feature.setStyle(style)
  }

  /**
   * 获取要素属性
   * @param feature 要素实例
   * @param key 属性键名
   * @returns 属性值
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * const feature = graphic.addFeature({
   *   type: GraphicType.Point,
   *   coordinates: [116.4, 39.9],
   *   properties: { name: '北京', id: 1 }
   * })
   *
   * const name = graphic.getProperty(feature, 'name')
   * console.log(name) // '北京'
   * ```
   */
  getProperty(feature: Feature, key: string): unknown {
    return feature.get(key)
  }

  /**
   * 设置要素属性
   * @param feature 要素实例
   * @param key 属性键名
   * @param value 属性值
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * const feature = graphic.addFeature({
   *   type: GraphicType.Point,
   *   coordinates: [116.4, 39.9]
   * })
   *
   * // 设置属性
   * graphic.setProperty(feature, 'name', '上海')
   * graphic.setProperty(feature, 'id', 2)
   * ```
   */
  setProperty(feature: Feature, key: string, value: unknown): void {
    feature.set(key, value)
  }
}
