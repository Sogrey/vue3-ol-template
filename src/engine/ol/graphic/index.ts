import OLEngine from '..'

import Map from 'ol/Map.js'
import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import { Draw, Modify, Snap, Pointer } from 'ol/interaction.js'
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
  Circle = 'Circle',
  /** 椭圆 */
  Ellipse = 'Ellipse',
  /** 正方形 */
  Square = 'Square',
  /** 矩形 */
  Box = 'Box'
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
  /** 编辑顶点样式 */
  vertexStyle?: {
    /** 顶点填充颜色 */
    fillColor?: string
    /** 顶点半径 */
    radius?: number
    /** 顶点描边颜色 */
    strokeColor?: string
    /** 顶点描边宽度 */
    strokeWidth?: number
  }
}

/**
 * 绘制配置接口
 */
export interface DrawOptions extends StyleOptions {
  /** 图形类型 */
  type: GraphicType
  /** 图层是否可编辑，默认 true */
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
 * 椭圆编辑交互类
 * 只显示中心点、长轴端点和短轴端点作为控制点
 */
class EllipseEditInteraction extends Pointer {
  private _source: VectorSource
  private _overlaySource: VectorSource
  private _selectedFeature: Feature | null = null
  private _overlayFeatures: Feature[] = []
  private _dragType: 'center' | 'axis1' | 'axis2' | null = null

  constructor(source: VectorSource, overlaySource: VectorSource) {
    super({
      handleDownEvent: (evt) => this._handleDown(evt),
      handleDragEvent: (evt) => { this._handleDrag(evt); return false; },
      handleUpEvent: (evt) => { this._handleUp(evt); return true; },
      handleMoveEvent: (evt) => this._handleMove(evt)
    })

    this._source = source
    this._overlaySource = overlaySource
  }

  setMap(map: Map | null): void {
    super.setMap(map)
    if (!map) {
      this._clearOverlays()
    }
  }

  private _handleDown(evt: any): boolean {
    const feature = evt.map.forEachFeatureAtPixel(evt.pixel, (f: any) => f)
    if (feature && this._overlayFeatures.includes(feature)) {
      this._dragType = feature.get('controlType')
      return true
    }
    return false
  }

  private _handleDrag(evt: any): void {
    if (!this._selectedFeature || !this._dragType) return

    const coord = evt.coordinate
    const geometry = this._selectedFeature.getGeometry() as Polygon
    const points = this._getControlPoints(geometry)

    if (this._dragType === 'center') {
      // 平移整个椭圆
      const dx = coord[0] - points.center[0]
      const dy = coord[1] - points.center[1]
      geometry.translate(dx, dy)
    } else if (this._dragType === 'axis1' || this._dragType === 'axis2') {
      // 调整轴长
      const dx = coord[0] - points.center[0]
      const dy = coord[1] - points.center[1]
      const newRadius = Math.sqrt(dx * dx + dy * dy)

      // 重新计算控制点
      this._updateEllipse(geometry, points, this._dragType, newRadius)
    }

    this._selectedFeature.changed()
    this._updateOverlays()
  }

  private _handleUp(_evt: any): void {
    this._dragType = null
  }

  private _handleMove(evt: any): boolean {
    const map = this.getMap()
    if (!map) return false

    const feature = map.forEachFeatureAtPixel(evt.pixel, (f: any) => f)
    const target = map.getTargetElement()

    if (target) {
      if (feature && (this._overlayFeatures.includes(feature) || feature.get('isEllipse'))) {
        target.style.cursor = 'pointer'
      } else {
        target.style.cursor = ''
      }
    }

    // 点击椭圆时选中
    if (feature && feature.get('isEllipse') && feature !== this._selectedFeature) {
      this._selectFeature(feature)
    }
    return false
  }

  private _selectFeature(feature: Feature): void {
    this._selectedFeature = feature
    this._updateOverlays()
  }

  private _clearOverlays(): void {
    this._overlayFeatures.forEach(f => this._overlaySource.removeFeature(f))
    this._overlayFeatures = []
  }

  private _updateOverlays(): void {
    this._clearOverlays()
    if (!this._selectedFeature) return

    const geometry = this._selectedFeature.getGeometry() as Polygon
    const points = this._getControlPoints(geometry)
    const style = new Style({
      image: new OLCircle({
        radius: 8,
        fill: new Fill({ color: '#ff6600' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 })
      })
    })

    // 创建控制点要素
    const centerFeature = new Feature({ geometry: new Point(points.center) })
    centerFeature.setStyle(style)
    centerFeature.set('controlType', 'center')
    this._overlaySource.addFeature(centerFeature)
    this._overlayFeatures.push(centerFeature)

    const axis1Feature = new Feature({ geometry: new Point(points.axis1) })
    axis1Feature.setStyle(style)
    axis1Feature.set('controlType', 'axis1')
    this._overlaySource.addFeature(axis1Feature)
    this._overlayFeatures.push(axis1Feature)

    const axis2Feature = new Feature({ geometry: new Point(points.axis2) })
    axis2Feature.setStyle(style)
    axis2Feature.set('controlType', 'axis2')
    this._overlaySource.addFeature(axis2Feature)
    this._overlayFeatures.push(axis2Feature)
  }

  private _getControlPoints(geometry: Polygon): { center: Coordinate; axis1: Coordinate; axis2: Coordinate } {
    const coords = geometry.getCoordinates()[0]

    // 计算中心
    let cx = 0, cy = 0
    if (coords) {
      for (const c of coords) {
        cx += c[0]
        cy += c[1]
      }
      cx /= coords.length
      cy /= coords.length

      // 找两个最远点
      let max1 = 0, max2 = 0
      let p1: Coordinate = [cx, cy], p2: Coordinate = [cx, cy]

      for (const c of coords) {
        const d = (c[0] - cx) ** 2 + (c[1] - cy) ** 2
        if (d > max1) {
          max2 = max1
          p2 = p1
          max1 = d
          p1 = c
        } else if (d > max2) {
          max2 = d
          p2 = c
        }
      }

      return { center: [cx, cy], axis1: p1, axis2: p2 }
    }
    return { center: [cx, cy], axis1: [cx, cy], axis2: [cx, cy] }
  }

  private _updateEllipse(geometry: Polygon, points: { center: Coordinate; axis1: Coordinate; axis2: Coordinate }, dragType: string, newRadius: number): void {
    const center = points.center
    const axis1 = points.axis1
    const axis2 = points.axis2

    const r1 = dragType === 'axis1' ? newRadius : Math.sqrt((axis1[0] - center[0]) ** 2 + (axis1[1] - center[1]) ** 2)
    const r2 = dragType === 'axis2' ? newRadius : Math.sqrt((axis2[0] - center[0]) ** 2 + (axis2[1] - center[1]) ** 2)
    const angle = Math.atan2(axis1[1] - center[1], axis1[0] - center[0])

    // 重新生成椭圆
    const segments = 64
    const newPoints: Coordinate[] = []
    for (let i = 0; i <= segments; i++) {
      const theta = (2 * Math.PI * i) / segments
      const x = r1 * Math.cos(theta)
      const y = r2 * Math.sin(theta)
      const rx = x * Math.cos(angle) - y * Math.sin(angle)
      const ry = x * Math.sin(angle) + y * Math.cos(angle)
      newPoints.push([center[0] + rx, center[1] + ry])
    }
    geometry.setCoordinates([newPoints])
  }
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
  private _currentModify: Modify | EllipseEditInteraction | null = null

  /** 当前吸附交互 */
  private _currentSnap: Snap | null = null

  /** 图层编辑状态集合 */
  private _layerEditableStates: Record<string, boolean> = {}

  /** 图层的 Modify 交互集合 */
  private _layerModifyInteractions: Record<string, Modify | EllipseEditInteraction> = {}

  /** 控制点图层（用于椭圆编辑） */
  private _overlayLayer: VectorLayer<VectorSource> | null = null

  constructor(engine: OLEngine) {
    this.engine = engine
    this._initOverlayLayer()
  }

  /**
   * 初始化控制点图层
   */
  private _initOverlayLayer(): void {
    const map = this.map
    if (!map) return

    if (!this._overlayLayer) {
      const source = new VectorSource({ wrapX: false })
      this._overlayLayer = new VectorLayer({
        source,
        zIndex: 999
      })
      map.addLayer(this._overlayLayer)
    }
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
   * @param editable 是否可编辑，默认 true
   * @returns 图层实例
   */
  private _getOrCreateLayer(layerName: string, editable: boolean = true): VectorLayer<VectorSource> {
    const map = this.map
    if (!map) throw new Error('地图未初始化')

    let layer = this._layers[layerName]

    if (!layer) {
      const source = new VectorSource({ wrapX: false })
      layer = new VectorLayer({
        source,
        zIndex: 100 // 确保在基础图层之上
      })
      layer.set('name', layerName)
      // 设置图层是否可编辑
      this._layerEditableStates[layerName] = editable
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
   * // 绘制正方形
   * graphic.startDraw({
   *   type: GraphicType.Square,
   *   strokeColor: '#ff00ff',
   *   strokeWidth: 2,
   *   fillColor: 'rgba(255,0,255,0.3)'
   * })
   *
   * // 绘制矩形
   * graphic.startDraw({
   *   type: GraphicType.Box,
   *   strokeColor: '#ffff00',
   *   strokeWidth: 2,
   *   fillColor: 'rgba(255,255,0,0.3)'
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
    const editable = options.editable !== false // 默认为 true
    const layer = this._getOrCreateLayer(layerName, editable)

    // 更新图层编辑状态
    this._layerEditableStates[layerName] = editable

    // 处理正方形、矩形和椭圆的几何函数
    let geometryFunction = null
    let drawType = options.type

    if (options.type === GraphicType.Square) {
      // 正方形：使用正多边形函数
      drawType = GraphicType.LineString
      // @ts-expect-error: createRegularPolygon is a static method on Draw class
      geometryFunction = Draw.createRegularPolygon(4)
    } else if (options.type === GraphicType.Box) {
      // 矩形：使用矩形函数
      drawType = GraphicType.LineString
      // @ts-expect-error: createBox is a static method on Draw class
      geometryFunction = Draw.createBox()
    } else if (options.type === GraphicType.Ellipse) {
      // 椭圆：使用 LineString + 自定义几何函数（三个点：中心、短轴端点、长轴端点）
      drawType = GraphicType.LineString
      // @ts-expect-error: geometryFunction 自定义类型
      geometryFunction = (coordinates: Coordinate[], geometry?: Polygon) => {
        const center = coordinates[0]
        const shortAxis = coordinates[1]
        const longAxis = coordinates[2]

        if (!center || !shortAxis) {
          return geometry || new Polygon([])
        }

        // 如果只有两个点，创建圆形
        if (!longAxis) {
          const dx = shortAxis[0] - center[0]
          const dy = shortAxis[1] - center[1]
          const radius = Math.sqrt(dx * dx + dy * dy)

          // 生成圆形的点
          const points: Coordinate[] = []
          const segments = 64
          for (let i = 0; i <= segments; i++) {
            const angle = (2 * Math.PI * i) / segments
            const x = center[0] + radius * Math.cos(angle)
            const y = center[1] + radius * Math.sin(angle)
            points.push([x, y])
          }
          return geometry ? geometry.setCoordinates([points]) : new Polygon([points])
        }

        // 计算第一次点击方向的向量和角度
        const firstDx = shortAxis[0] - center[0]
        const firstDy = shortAxis[1] - center[1]
        const firstAngle = Math.atan2(firstDy, firstDx)
        const firstRadius = Math.sqrt(firstDx * firstDx + firstDy * firstDy)

        // 计算当前鼠标位置与中心的向量
        const currentDx = longAxis[0] - center[0]
        const currentDy = longAxis[1] - center[1]
        const currentAngle = Math.atan2(currentDy, currentDx)
        const currentRadius = Math.sqrt(currentDx * currentDx + currentDy * currentDy)

        // 计算两个向量的夹角（绝对值，取0到π之间）
        let angleDiff = Math.abs(currentAngle - firstAngle)
        if (angleDiff > Math.PI) {
          angleDiff = 2 * Math.PI - angleDiff
        }

        // 判断夹角是否大于45度（π/4）
        // 如果大于45度，第一次点击方向为短轴，鼠标方向为长轴
        // 如果小于45度，第一次点击方向为长轴，鼠标方向为短轴
        let longRadius: number
        let shortRadius: number
        let rotationAngle: number

        if (angleDiff > Math.PI / 4) {
          // 夹角大于45度：第一次方向为短轴
          shortRadius = firstRadius
          longRadius = currentRadius
          rotationAngle = firstAngle
        } else {
          // 夹角小于45度：第一次方向为长轴
          longRadius = firstRadius
          shortRadius = currentRadius
          rotationAngle = firstAngle + Math.PI / 2 // 垂直方向
        }

        // 使用参数方程生成椭圆的点（考虑旋转）
        const points: Coordinate[] = []
        const segments = 64
        for (let i = 0; i <= segments; i++) {
          const angle = (2 * Math.PI * i) / segments

          // 未旋转的椭圆点
          const localX = longRadius * Math.cos(angle)
          const localY = shortRadius * Math.sin(angle)

          // 应用旋转
          const rotatedX = localX * Math.cos(rotationAngle) - localY * Math.sin(rotationAngle)
          const rotatedY = localX * Math.sin(rotationAngle) + localY * Math.cos(rotationAngle)

          // 加上中心点
          points.push([center[0] + rotatedX, center[1] + rotatedY])
        }

        return geometry ? geometry.setCoordinates([points]) : new Polygon([points])
      }
    }

    // 创建绘制交互
    const draw = new Draw({
      source: layer.getSource()!,
      type: drawType as 'Point' | 'LineString' | 'Polygon' | 'Circle',
      geometryFunction
    })

    // 绘制完成事件
    draw.on('drawend', (event) => {
      const feature = event.feature
      if (feature) {
        // 设置样式
        const style = this._createStyle(options)
        feature.setStyle(style)

        // 对于椭圆，标记为椭圆类型以便后续特殊处理
        if (options.type === GraphicType.Ellipse) {
          feature.set('isEllipse', true)
        }

        if (options.onComplete) {
          options.onComplete(feature)
        }
      }
    })

    // 对于椭圆，监听三个点后自动完成
    if (options.type === GraphicType.Ellipse) {
      let clickCount = 0
      const clickHandler = () => {
        clickCount++
        if (clickCount >= 3) {
          // 第三个点点击后自动完成绘制
          setTimeout(() => {
            draw.finishDrawing()
          }, 100)
          // 移除监听器
          map.un('click', clickHandler)
        }
      }
      map.on('click', clickHandler)

      // 绘制开始时重置计数器
      draw.on('drawstart', () => {
        clickCount = 0
      })
    }

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

    // 设置鼠标样式
    const mapContainer = map.getTargetElement()
    if (mapContainer) {
      mapContainer.style.cursor = 'crosshair'
    }

    // 如果图层可编辑，启用修改交互（持久化到图层）
    if (editable) {
      // 如果该图层还没有 Modify 交互，创建一个
      if (!this._layerModifyInteractions[layerName]) {
        // 检查图层是否有椭圆要素
        const hasEllipse = layer.getSource()?.getFeatures().some(f => f.get('isEllipse'))

        if (hasEllipse && this._overlayLayer) {
          // 为椭圆图层创建特殊的编辑交互
          const ellipseEdit = new EllipseEditInteraction(
            layer.getSource()!,
            this._overlayLayer.getSource()!
          )
          this._layerModifyInteractions[layerName] = ellipseEdit
          map.addInteraction(ellipseEdit)
        } else {
          // 创建顶点样式（圆点）
          const vertexStyle = new Style({
            image: new OLCircle({
              radius: 6,
              fill: new Fill({ color: '#ff6600' }),
              stroke: new Stroke({ color: '#ffffff', width: 2 })
            })
          })

          const modify = new Modify({
            source: layer.getSource()!,
            style: vertexStyle
          })
          this._layerModifyInteractions[layerName] = modify
          map.addInteraction(modify)
        }
      }
      // 设置临时引用（用于兼容旧逻辑）
      this._currentModify = this._layerModifyInteractions[layerName]
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

    // 注意：不移除 Modify 交互，因为它与图层绑定并持久化存在
    // 只清空临时引用
    this._currentModify = null

    // 移除吸附交互
    if (this._currentSnap) {
      map.removeInteraction(this._currentSnap)
      this._currentSnap = null
    }

    // 恢复鼠标样式
    const mapContainer = map.getTargetElement()
    if (mapContainer) {
      mapContainer.style.cursor = 'auto'
    }
  }

  /**
   * 设置图层是否可编辑
   * @param layerName 图层名称
   * @param editable 是否可编辑
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * // 禁用默认图层编辑
   * graphic.setEditable('draw-layer', false)
   *
   * // 启用指定图层编辑
   * graphic.setEditable('custom-layer', true)
   * ```
   */
  setEditable(layerName: string, editable: boolean): void {
    const map = this.map
    if (!map) throw new Error('地图未初始化')

    const layer = this._layers[layerName]
    if (!layer) {
      throw new Error(`图层 ${layerName} 不存在`)
    }

    // 更新编辑状态
    this._layerEditableStates[layerName] = editable

    // 获取该图层的 Modify 交互
    const existingModify = this._layerModifyInteractions[layerName]

    if (existingModify) {
      // 如果已有 Modify 交互
      if (editable) {
        // 启用编辑：添加到地图
        if (!map.getInteractions().getArray().includes(existingModify)) {
          map.addInteraction(existingModify)
        }
      } else {
        // 禁用编辑：从地图移除
        map.removeInteraction(existingModify)
      }
    } else if (editable) {
      // 没有 Modify 交互且需要编辑：创建新的
      // 创建顶点样式（圆点）
      const vertexStyle = new Style({
        image: new OLCircle({
          radius: 6,
          fill: new Fill({ color: '#ff6600' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      })

      const modify = new Modify({
        source: layer.getSource()!,
        style: vertexStyle
      })
      this._layerModifyInteractions[layerName] = modify
      map.addInteraction(modify)
    }
  }

  /**
   * 获取图层是否可编辑
   * @param layerName 图层名称
   * @returns 是否可编辑
   * @example
   * ```typescript
   * const engine = OLEngine.getInstance()
   * const graphic = engine.Graphic
   *
   * const isEditable = graphic.isEditable('draw-layer')
   * console.log('图层是否可编辑:', isEditable)
   * ```
   */
  isEditable(layerName: string): boolean {
    return this._layerEditableStates[layerName] ?? true // 默认为 true
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
      const coords = coordinates as unknown as Coordinate[]
      if (!coords || coords.length < 2) {
        throw new Error('圆形需要至少两个坐标点（中心和边缘）')
      }
      const center = coords[0] ?? [0, 0]
      const edge = coords[1] ?? [0, 0]
      const radius = Math.sqrt(
        Math.pow((edge[0] ?? 0) - (center[0] ?? 0), 2) +
          Math.pow((edge[1] ?? 0) - (center[1] ?? 0), 2)
      )
      geometry = new Circle(center, radius)
    } else if (options.type === GraphicType.Ellipse) {
      // 椭圆需要三个点：中心、短轴端点、长轴端点
      const coords = coordinates as unknown as Coordinate[]
      if (!coords || coords.length < 2) {
        throw new Error('椭圆需要至少两个坐标点（中心和短轴端点）')
      }
      const center = coords[0] ?? [0, 0]
      const shortAxis = coords[1] ?? [0, 0]
      const longAxis = coords[2]

      // 如果只有两个点，创建圆形
      if (!longAxis) {
        const dx = shortAxis[0] - center[0]
        const dy = shortAxis[1] - center[1]
        const radius = Math.sqrt(dx * dx + dy * dy)

        const points: Coordinate[] = []
        const segments = 64
        for (let i = 0; i <= segments; i++) {
          const angle = (2 * Math.PI * i) / segments
          const x = center[0] + radius * Math.cos(angle)
          const y = center[1] + radius * Math.sin(angle)
          points.push([x, y])
        }
        geometry = new Polygon([points])
      } else {
        // 计算短半轴长度和角度
        const dx = shortAxis[0] - center[0]
        const dy = shortAxis[1] - center[1]
        const shortRadius = Math.sqrt(dx * dx + dy * dy)
        const shortAngle = Math.atan2(dy, dx)

        // 计算长半轴长度
        const longDx = longAxis[0] - center[0]
        const longDy = longAxis[1] - center[1]
        const longRadius = Math.sqrt(longDx * longDx + longDy * longDy)

        // 使用参数方程生成旋转的椭圆
        const points: Coordinate[] = []
        const segments = 64
        for (let i = 0; i <= segments; i++) {
          const angle = (2 * Math.PI * i) / segments

          // 未旋转的椭圆点
          const localX = longRadius * Math.cos(angle)
          const localY = shortRadius * Math.sin(angle)

          // 应用旋转
          const rotatedX = localX * Math.cos(shortAngle) - localY * Math.sin(shortAngle)
          const rotatedY = localX * Math.sin(shortAngle) + localY * Math.cos(shortAngle)

          // 加上中心点
          points.push([center[0] + rotatedX, center[1] + rotatedY])
        }

        geometry = new Polygon([points])
      }
    } else if (options.type === GraphicType.Point) {
      geometry = new Point(coordinates as unknown as Coordinate)
    } else if (options.type === GraphicType.LineString) {
      geometry = new LineString(coordinates as unknown as Coordinate[])
    } else if (options.type === GraphicType.Polygon) {
      geometry = new Polygon(coordinates as unknown as Coordinate[][])
    } else if (options.type === GraphicType.Square) {
      // 正方形：使用 LineString + createRegularPolygon 创建
      const coords = coordinates as unknown as Coordinate[]
      if (!coords || coords.length < 2) {
        throw new Error('正方形需要至少两个坐标点（对角线）')
      }
      // 计算正方形的四个顶点
      // @ts-expect-error: createRegularPolygon is static method of Draw
      const createRegularPolygon = Draw.createRegularPolygon
      const geomFunc = createRegularPolygon(4)
      geometry = geomFunc(coords)
    } else if (options.type === GraphicType.Box) {
      // 矩形：使用 LineString + createBox 创建
      const coords = coordinates as unknown as Coordinate[]
      if (!coords || coords.length < 2) {
        throw new Error('矩形需要至少两个坐标点（对角线）')
      }
      // 计算矩形的四个顶点
      // @ts-expect-error: createBox is a static method on Draw class
      const createBox = Draw.createBox as () => (
        coordinates: Coordinate[],
        geometry?: Polygon
      ) => Polygon
      const geomFunc = createBox()
      geometry = geomFunc(coords)
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
      // 移除图层
      map.removeLayer(layer)

      // 移除关联的 Modify 交互
      const modify = this._layerModifyInteractions[layerName]
      if (modify) {
        map.removeInteraction(modify)
        delete this._layerModifyInteractions[layerName]
      }

      // 清理状态
      delete this._layerEditableStates[layerName]
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

    // 移除所有 Modify 交互
    Object.values(this._layerModifyInteractions).forEach((modify) => {
      map.removeInteraction(modify)
    })
    this._layerModifyInteractions = {}

    // 移除所有图层
    Object.values(this._layers).forEach((layer) => {
      map.removeLayer(layer)
    })

    // 清理所有状态
    Object.keys(this._layers).forEach((key) => {
      delete this._layers[key]
    })
    this._layerEditableStates = {}
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
