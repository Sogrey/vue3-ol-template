# Vue 3 + OpenLayers Template

这是一个基于Vue 3和OpenLayers构建的地图应用模板，包含了完整的开发环境配置和最佳实践。

## 🚀 项目特性

- **Vue 3**: 使用最新的Vue 3 Composition API
- **TypeScript**: 完整的TypeScript支持
- **OpenLayers**: 强大的开源地图库
- **Vite**: 快速的构建工具
- **Vue Router**: 路由管理
- **ESLint + Prettier**: 代码质量检查
- **Less**: CSS预处理器

## 📦 项目结构

```
src/
├── components/          # 可复用组件
│   └── OLScene.vue      # OpenLayers地图组件
├── views/               # 页面组件
│   └── IndexView.vue    # 主页面
├── engine/              # 引擎层
│   └── ol/              # OpenLayers引擎
│       ├── index.ts      # 核心引擎类
│       ├── index.types.ts # 类型定义
│       └── utils.ts      # 工具函数
├── router/              # 路由配置
│   └── index.ts
├── App.vue              # 根组件
├── main.ts              # 入口文件
└── env.d.ts             # 类型声明
```

## 🛠️ 开发环境配置

### 推荐IDE

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (禁用Vetur)

### 浏览器扩展

- Chromium浏览器 (Chrome, Edge, Brave等):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

## 🔧 安装依赖

```bash
# 使用pnpm (推荐)
pnpm install

# 或使用npm
npm install

# 或使用yarn
yarn install
```

## 🚀 开发命令

### 启动开发服务器
```bash
pnpm dev
```

### 类型检查
```bash
pnpm type-check
```

### 构建生产版本
```bash
pnpm build
```

### 代码检查
```bash
pnpm lint
```

### 代码格式化
```bash
pnpm format
```

## 📖 使用说明

### 引擎层使用

项目提供了完整的 OpenLayers 引擎封装，您可以在 `src/engine/ol/index.ts` 中使用：

```typescript
import OLEngine from '@/engine/ol'

// 获取引擎实例
const engine = OLEngine.getInstance()

// 初始化地图
engine.init('map-container', {
  view: new View({
    center: [116.4, 39.9], // 北京坐标
    zoom: 10
  })
})

// 获取地图实例
const map = engine.map
if (map) {
  // 地图操作
}

// 销毁地图
engine.destroy()
```

### 地图组件使用

项目已经配置了基本的OpenLayers地图组件，您可以在 `src/components/OLScene.vue` 中找到：

```vue
<template>
  <div id="map"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import Map from 'ol/Map.js'
import OSM from 'ol/source/OSM.js'
import TileLayer from 'ol/layer/Tile.js'
import View from 'ol/View.js'

onMounted(() => {
  const map = new Map({
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
  })
})
</script>

<style lang="less" scoped>
#map {
  width: 100%;
  height: 100%;
}
</style>
```

### 路由配置

项目使用Vue Router进行路由管理，基本配置在 `src/router/index.ts`：

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import IndexView from '@/views/IndexView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'index',
      component: IndexView,
    }
  ],
})

export default router
```

## 🛡️ 类型安全

项目已配置完整的TypeScript支持：

- Vue单文件组件类型声明
- Vue Router类型声明
- 模块路径别名 (`@/` 指向 `src/`)

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 📝 更新日志

### 最新更新
- ✅ 优化 OLScene.vue 组件，使用 OpenLayers 引擎封装层
- ✅ 修复 TypeScript 类型定义，将 OLMapOptions 接口属性改为可选
- ✅ 添加了完整的 MIT 许可证文件
- ✅ 修复了 TypeScript 类型声明问题
- ✅ 符合 ESLint Vue 组件命名规范（多单词组件名）
- ✅ 完整的项目文档和开发指南
- ✅ 新增 OpenLayers 引擎封装层
- ✅ 完整的类型定义和工具函数
- ✅ 详细的中文代码注释
- ✅ 更新代码注释时间戳到当前日期
- ✅ 优化代码文档生成配置

### 详细修改
- **OLScene.vue**: 
  - 改用 OpenLayers 引擎封装层进行地图初始化
  - 优化销毁逻辑，使用引擎的 destroy 方法
  - 删除冗余的 Map 直接导入
- **index.types.ts**: 
  - 将 OLMapOptions 接口的 target、view、layers 属性改为可选 (?)
  - 提高类型定义的灵活性

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个模板！

## 📞 联系方式

- 项目作者: Sogrey
- GitHub: [https://github.com/Sogrey/vue3-ol-template](https://github.com/Sogrey/vue3-ol-template)