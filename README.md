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

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个模板！