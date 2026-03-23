import OLEngine from '..'

import Map from 'ol/Map.js'
import { Tween, Easing } from '@tweenjs/tween.js'

/**
 * 视角信息接口
 */
export interface CameraViewOptions {
  /** 经度 */
  lng: number
  /** 纬度 */
  lat: number
  /** 缩放级别 */
  zoom?: number
  /** 旋转角度（度） */
  rotation?: number
}

/**
 * 漫游路径点配置
 */
export interface RoamingPoint extends CameraViewOptions {
  /** 到达此点耗时（秒） */
  duration?: number
  /** 到达此点后停留时间（秒） */
  stop?: number
  /** 缓动函数 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  easingFunction?: any
}

/**
 * 漫游配置参数
 */
export interface RoamingOptions {
  /** 漫游路径点列表 */
  points: RoamingPoint[]
  /** 是否循环播放 */
  loop?: boolean
  /** 是否开启飞行动画 */
  flyTo?: boolean
  /** 实时回调函数 */
  onUpdate?: (state: RoamingState) => void
  /** 漫游完成回调 */
  onComplete?: () => void
}

/**
 * 漫游实时状态
 */
export interface RoamingState {
  /** 当前相机位置 */
  position: CameraViewOptions
  /** 总漫游时长（毫秒） */
  totalDuration: number
  /** 已漫游时长（毫秒） */
  elapsedTime: number
  /** 当前路径点索引 */
  currentPointIndex: number
}

/**
 * Camera 模块类
 * 提供相机视角的获取、设置和漫游功能
 *
 * - **`getView()`** - 获取当前相机视角信息
 * - **`setView()`** - 设置相机视角（支持直接跳转和动画过渡）
 * - **`initRoaming()`** - 初始化视角漫游配置
 * - **`startRoaming()`** - 开启视角漫游
 * - **`pauseRoaming()`** - 暂停漫游
 * - **`resumeRoaming()`** - 继续漫游
 * - **`stopRoaming()`** - 停止漫游
 * - **`getRoamingState()`** - 获取漫游状态
 */
export default class Camera {
  private engine: OLEngine

  private _tweens: Tween<Record<string, unknown>>[] = []

  private _isRoaming = false

  private _isPaused = false

  private _roamingOptions: RoamingOptions | null = null

  private _totalDuration = 0

  private _elapsedTime = 0

  private _animationFrameId: number | null = null

  private _roamingStartTime: number | null = null

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
   * 获取当前相机视角信息
   * @returns 包含位置和方向信息的对象
   * @example
   * ```typescript
   * // 获取当前视角
   * const engine = OLEngine.getInstance()
   * const camera = engine.Camera
   * const view = camera.getView()
   * if (view) {
   *   console.log(`经度: ${view.lng}, 纬度: ${view.lat}`)
   *   console.log(`缩放级别: ${view.zoom}`)
   *   console.log(`旋转角度: ${view.rotation}`)
   * }
   * ```
   */
  getView(): CameraViewOptions | null {
    const map = this.map
    if (!map) return null

    const view = map.getView()
    if (!view) return null

    const center = view.getCenter()
    if (!center) return null

    // OpenLayers 坐标系是 Web Mercator (EPSG:3857)，需要转换为经纬度
    const [lng, lat] = this._transformWebMercatorToLonLat(center)

    return {
      lng,
      lat,
      zoom: view.getZoom() ?? 0,
      rotation: view.getRotation() ?? 0
    }
  }

  /**
   * 设置相机视角
   * @param options 视角配置参数
   * @example
   * ```typescript
   * // 直接跳转到指定位置
   * const engine = OLEngine.getInstance()
   * const camera = engine.Camera
   * camera.setView({
   *   lng: 116.4,
   *   lat: 39.9,
   *   zoom: 12,
   *   rotation: 0
   * })
   *
   * // 使用动画过渡到指定位置
   * camera.setView({
   *   lng: 116.4,
   *   lat: 39.9,
   *   zoom: 12,
   *   rotation: 45,
   *   animate: true
   * })
   *
   * // 只更新缩放级别，保持当前位置
   * camera.setView({
   *   zoom: 15,
   *   animate: true
   * })
   * ```
   */
  setView(options: Partial<CameraViewOptions> & { animate?: boolean }): void {
    const map = this.map
    if (!map) return

    const view = map.getView()
    if (!view) return

    const currentCenter = view.getCenter()
    const currentZoom = view.getZoom() ?? 0

    // 获取经纬度，如果没有指定则使用当前位置
    let lng = options.lng
    let lat = options.lat
    if (lng === undefined && lat === undefined && currentCenter) {
      const [currentLng, currentLat] = this._transformWebMercatorToLonLat(currentCenter)
      lng = currentLng
      lat = currentLat
    }

    const zoom = options.zoom ?? currentZoom
    const rotation = options.rotation ?? 0

    // 将经纬度转换为 Web Mercator 坐标
    const center = this._transformLonLatToWebMercator(lng ?? 0, lat ?? 0)

    if (options.animate) {
      view.animate({
        center,
        zoom,
        rotation,
        duration: 1000
      })
    } else {
      view.setCenter(center)
      view.setZoom(zoom)
      view.setRotation(rotation)
    }
  }

  /**
   * 初始化视角漫游
   * @param options 漫游配置参数
   * @example
   * ```typescript
   * // 初始化漫游配置
   * const engine = OLEngine.getInstance()
   * const camera = engine.Camera
   *
   * camera.initRoaming({
   *   points: [
   *     { lng: 116.4, lat: 39.9, zoom: 10, duration: 3 },
   *     { lng: 116.5, lat: 40.0, zoom: 12, duration: 4 },
   *     { lng: 116.6, lat: 40.1, zoom: 8, duration: 5 }
   *   ],
   *   loop: true,
   *   onUpdate: (state) => {
   *     console.log(`当前路径点: ${state.currentPointIndex}`)
   *     console.log(`已漫游: ${state.elapsedTime / 1000}秒`)
   *   },
   *   onComplete: () => {
   *     console.log('漫游完成')
   *   }
   * })
   * ```
   */
  initRoaming(options: RoamingOptions): void {
    this._roamingOptions = options
    this._isRoaming = false
    this._isPaused = false
  }

  /**
   * 开启视角漫游
   * @example
   * ```typescript
   * // 先初始化漫游配置
   * const engine = OLEngine.getInstance()
   * const camera = engine.Camera
   *
   * camera.initRoaming({
   *   points: [
   *     { lng: 116.4, lat: 39.9, zoom: 10, duration: 3 },
   *     { lng: 116.5, lat: 40.0, zoom: 12, duration: 4 },
   *     { lng: 116.6, lat: 40.1, zoom: 8, duration: 5 }
   *   ]
   * })
   *
   * // 开启漫游
   * camera.startRoaming()
   * ```
   */
  startRoaming(): void {
    const map = this.map
    if (!map || !this._roamingOptions) return

    // 如果已经在漫游中，先停止
    if (this._isRoaming) {
      this.stopRoaming()
    }

    const views = this._roamingOptions.points
    if (views.length < 2) {
      console.warn('漫游路径点至少需要2个')
      return
    }

    // 创建 Tweens
    this._tweens = this._createTweens(views)

    if (this._tweens.length === 0) return

    // 计算总时长
    this._totalDuration = this._calculateTotalDuration(views)
    this._roamingStartTime = Date.now()
    this._elapsedTime = 0
    this._isRoaming = true
    this._isPaused = false

    // 启动第一个 tween
    const firstTween = this._tweens[0]
    if (firstTween) {
      firstTween.start()
    }

    // 开始动画循环
    this._startAnimationLoop()
  }

  /**
   * 暂停漫游
   * @example
   * ```typescript
   * // 漫游过程中暂停
   * const engine = OLEngine.getInstance()
   * const camera = engine.Camera
   *
   * // 暂停漫游
   * camera.pauseRoaming()
   *
   * // 检查状态
   * const state = camera.getRoamingState()
   * console.log(state.isPaused) // true
   * ```
   */
  pauseRoaming(): void {
    if (!this._isRoaming || this._isPaused) return

    this._isPaused = true

    // 停止动画循环
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId)
      this._animationFrameId = null
    }
  }

  /**
   * 继续漫游
   * @example
   * ```typescript
   * // 漫游暂停后继续
   * const engine = OLEngine.getInstance()
   * const camera = engine.Camera
   *
   * // 暂停漫游
   * camera.pauseRoaming()
   *
   * // 继续漫游
   * camera.resumeRoaming()
   * ```
   */
  resumeRoaming(): void {
    if (!this._isRoaming || !this._isPaused) return

    this._isPaused = false

    // 重新开始动画循环
    this._startAnimationLoop()
  }

  /**
   * 停止漫游
   * 停止后释放内存占用，停止后不能暂停/继续，只能重新开始
   * @example
   * ```typescript
   * // 停止漫游
   * const engine = OLEngine.getInstance()
   * const camera = engine.Camera
   *
   * // 停止漫游
   * camera.stopRoaming()
   *
   * // 检查状态
   * const state = camera.getRoamingState()
   * console.log(state.isRoaming) // false
   * ```
   */
  stopRoaming(): void {
    // 先设置停止标志，防止在清理过程中触发回调
    this._isRoaming = false
    this._isPaused = false

    // 停止动画循环
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId)
      this._animationFrameId = null
    }

    // 停止所有 tween
    if (this._tweens.length > 0) {
      for (const tween of this._tweens) {
        tween.stop()
      }
      this._tweens = []
    }
  }

  /**
   * 获取漫游状态
   * @returns 漫游状态对象，包含是否正在漫游和是否暂停
   * @example
   * ```typescript
   * // 检查漫游状态
   * const engine = OLEngine.getInstance()
   * const camera = engine.Camera
   *
   * const state = camera.getRoamingState()
   * console.log(`是否漫游中: ${state.isRoaming}`)
   * console.log(`是否暂停: ${state.isPaused}`)
   *
   * // 根据状态执行不同操作
   * if (state.isRoaming && !state.isPaused) {
   *   console.log('漫游进行中...')
   * } else if (state.isPaused) {
   *   console.log('漫游已暂停')
   * } else {
   *   console.log('漫游未开始或已停止')
   * }
   * ```
   */
  getRoamingState(): { isRoaming: boolean; isPaused: boolean } {
    return {
      isRoaming: this._isRoaming,
      isPaused: this._isPaused
    }
  }

  /**
   * 创建 Tweens 数组
   */
  private _createTweens(views: RoamingPoint[]): Tween<Record<string, unknown>>[] {
    const m = views.length - 1
    const tweens: Tween<Record<string, unknown>>[] = []

    for (let i = 0; i < m; i++) {
      const i0 = i - 1 < 0 ? 0 : i - 1
      const i1 = i
      const i2 = i + 1 > m ? m : i + 1
      const i3 = i + 2 > m ? m : i + 2

      const startObject = {
        lng: views[i0]?.lng ?? 0,
        lat: views[i0]?.lat ?? 0,
        zoom: views[i0]?.zoom ?? 10,
        rotation: views[i0]?.rotation ?? 0
      }

      const stopObject: Record<string, unknown> = {
        lng: [views[i1]?.lng ?? 0, views[i2]?.lng ?? 0, views[i3]?.lng ?? 0],
        lat: [views[i1]?.lat ?? 0, views[i2]?.lat ?? 0, views[i3]?.lat ?? 0],
        zoom: [views[i1]?.zoom ?? 10, views[i2]?.zoom ?? 10, views[i3]?.zoom ?? 10],
        rotation: [views[i1]?.rotation ?? 0, views[i2]?.rotation ?? 0, views[i3]?.rotation ?? 0]
      }

      const duration = (views[i1]?.duration ?? 3) * 1000
      const delay = (views[i1]?.stop ?? 0) * 1000
      const easingFunction = views[i1]?.easingFunction ?? Easing.Linear.None

      const tween = new Tween(startObject)
        .to(stopObject, duration)
        .delay(delay)
        .easing(easingFunction)
        .interpolation(this._catmullRomInterpolation.bind(this))
        .onUpdate((obj: Record<string, unknown>) => {
          // 漫游已停止时直接返回，防止 stopRoaming 后继续执行回调
          if (!this._isRoaming) return

          // 从 obj 获取当前值
          const lng = (obj.lng ?? startObject.lng) as number
          const lat = (obj.lat ?? startObject.lat) as number
          const zoom = (obj.zoom ?? startObject.zoom) as number
          const rotation = (obj.rotation ?? startObject.rotation) as number

          this._updateCamera({
            lng,
            lat,
            zoom,
            rotation
          })

          // 计算已漫游时长
          if (this._roamingStartTime) {
            this._elapsedTime = Date.now() - this._roamingStartTime
          }

          // 触发实时回调
          if (this._roamingOptions?.onUpdate) {
            const state = this._getRoamingState(i)
            this._roamingOptions.onUpdate(state)
          }
        })
        .onComplete(() => {
          // 漫游已停止时直接返回
          if (!this._isRoaming) return

          if (i === m - 1) {
            this._onRoamingComplete()
          }
        })

      tweens.push(tween)
    }

    // 不使用链式连接，在 onComplete 中手动处理
    for (let i = 0; i < tweens.length; i++) {
      const tween = tweens[i]
      if (!tween) continue

      // 每个 tween 完成后自动启动下一个
      if (i < tweens.length - 1) {
        const nextTween = tweens[i + 1]
        if (nextTween) {
          tween.onComplete(() => {
            // 漫游已停止时直接返回
            if (!this._isRoaming) return

            nextTween.start()
          })
        }
      }
    }

    return tweens
  }

  /**
   * 开始动画循环
   */
  private _startAnimationLoop(): void {
    const animate = (time: number) => {
      if (!this._isRoaming || this._isPaused) return

      // 更新所有活动的 tween
      for (const tween of this._tweens) {
        // @ts-expect-error - tween.js 内部属性，用于判断是否正在播放
        if (tween._isPlaying) {
          tween.update(time)
        }
      }

      this._animationFrameId = requestAnimationFrame(animate)
    }

    this._animationFrameId = requestAnimationFrame(animate)
  }

  /**
   * Catmull-Rom 插值函数
   */
  private _catmullRomInterpolation(v: number | number[], t: number, alpha = 0.5): number {
    let p0: number, p1: number, p2: number, p3: number

    if (Array.isArray(v)) {
      if (v.length < 3) {
        return v[0] ?? 0
      }
      p0 = v[0] ?? 0
      p1 = v[1] ?? 0
      p2 = v[2] ?? 0
      p3 = v[3] ?? v[2] ?? 0
    } else {
      return v
    }

    let dt0 = Math.pow(Math.abs(p0 - p1), alpha)
    let dt1 = Math.pow(Math.abs(p1 - p2), alpha)
    let dt2 = Math.pow(Math.abs(p2 - p3), alpha)

    // 先处理 dt1，再处理 dt0 和 dt2（因为 dt0 可能依赖 dt1）
    if (dt1 < 1e-4) dt1 = 1.0
    if (dt0 < 1e-4) dt0 = dt1
    if (dt2 < 1e-4) dt2 = dt1

    // 防止 NaN
    if (!isFinite(dt0)) dt0 = 1.0
    if (!isFinite(dt1)) dt1 = 1.0
    if (!isFinite(dt2)) dt2 = 1.0

    let t0 = (p1 - p0) / dt0 - (p2 - p0) / (dt0 + dt1) + (p2 - p1) / dt1
    let t1_calc = (p2 - p1) / dt1 - (p3 - p1) / (dt1 + dt2) + (p3 - p2) / dt2

    t0 *= dt1
    t1_calc *= dt1

    const x0 = p1
    const x1 = p2
    const a0 = x0
    const a1 = t0
    const a2 = -3 * x0 + 3 * x1 - 2 * t0 - t1_calc
    const a3 = 2 * x0 - 2 * x1 + t0 + t1_calc

    const tt = t * t
    const ttt = tt * t

    return a0 + a1 * t + a2 * tt + a3 * ttt
  }

  /**
   * 更新相机位置
   */
  private _updateCamera(view: CameraViewOptions): void {
    const map = this.map
    if (!map) return

    const viewInstance = map.getView()
    if (!viewInstance) return

    const center = this._transformLonLatToWebMercator(view.lng, view.lat)

    viewInstance.setCenter(center)
    viewInstance.setZoom(view.zoom ?? 0)
    viewInstance.setRotation(view.rotation ?? 0)
  }

  /**
   * 获取漫游状态
   */
  private _getRoamingState(currentIndex: number): RoamingState {
    const position = this.getView()

    return {
      position: {
        lng: position?.lng ?? 0,
        lat: position?.lat ?? 0,
        zoom: position?.zoom ?? 0,
        rotation: position?.rotation ?? 0
      },
      totalDuration: this._totalDuration,
      elapsedTime: this._elapsedTime,
      currentPointIndex: currentIndex
    }
  }

  /**
   * 计算总时长
   */
  private _calculateTotalDuration(views: RoamingPoint[]): number {
    let total = 0
    for (let i = 0; i < views.length - 1; i++) {
      total += (views[i]?.duration ?? 3) * 1000
      total += (views[i]?.stop ?? 0) * 1000
    }
    return total
  }

  /**
   * 漫游完成处理
   */
  private _onRoamingComplete(): void {
    // 停止动画循环
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId)
      this._animationFrameId = null
    }

    // 检查是否需要循环
    const shouldLoop = this._roamingOptions?.loop ?? false

    // 如果需要循环，重新开始漫游
    if (shouldLoop) {
      // 清空 tween 数组
      this._tweens = []

      // 重新开始漫游
      this.startRoaming()
      return
    }

    // 触发完成回调
    if (this._roamingOptions?.onComplete) {
      this._roamingOptions.onComplete()
    }

    // 清空 tween 数组
    this._tweens = []

    // 重置状态
    this._isRoaming = false
    this._isPaused = false
  }

  /**
   * 将 Web Mercator 坐标转换为经纬度
   * @param coords Web Mercator 坐标 [x, y]
   * @returns 经纬度 [lng, lat]
   */
  private _transformWebMercatorToLonLat(coords: number[]): [number, number] {
    const x = coords[0] ?? 0
    const y = coords[1] ?? 0

    const lng = (x * 180) / 20037508.34
    const lat = (Math.PI / 2 - 2 * Math.atan(Math.exp((-y * Math.PI) / 20037508.34))) * (180 / Math.PI)

    return [lng, lat]
  }

  /**
   * 将经纬度转换为 Web Mercator 坐标
   * @param lng 经度
   * @param lat 纬度
   * @returns Web Mercator 坐标 [x, y]
   */
  private _transformLonLatToWebMercator(lng: number, lat: number): number[] {
    const x = (lng * 20037508.34) / 180
    const y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)
    const mercatorY = (y * 20037508.34) / 180

    return [x, mercatorY]
  }
}
