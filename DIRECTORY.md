# Frontend Directory Structure

```
frontend/
├── app/                          # Next.js App Router 页面
│   ├── layout.jsx                # 全局布局组件
│   ├── page.jsx                  # 首页 (Canvas 入口)
│   ├── blob/                     # Blob 页面
│   │   └── page.jsx
│   ├── global.css                # 全局样式
│   └── head.jsx                  # <head> 配置
│
├── public/                       # 静态资源
│   ├── dog.glb                   # 3D 模型示例
│   ├── duck.glb
│   ├── img/                      # 图片资源
│   │   ├── logo.svg
│   │   └── scores/
│   └── icons/                    # PWA 图标
│
├── src/
│   ├── components/
│   │   ├── canvas/               # 3D 组件 (React Three Fiber)
│   │   │   ├── Scene.jsx         # 3D 场景主组件
│   │   │   ├── View.jsx          # Canvas 视口组件 (tunnel-rat)
│   │   │   ├── Examples.jsx      # 示例组件集合
│   │   │   ├── StarRing.jsx      # 星环特效
│   │   │   └── PortalHexagram.jsx # 六芒星传送门
│   │   │
│   │   └── dom/                  # DOM 组件
│   │       └── Layout.jsx        # UI 布局组件
│   │
│   ├── store/                    # 状态管理 (Zustand)
│   │   └── gameStore.ts          # 游戏状态存储
│   │
│   ├── templates/                # 模板组件
│   │   ├── Scroll.jsx            # 滚动模板
│   │   ├── Shader/               # Shader 模板
│   │   │   ├── Shader.jsx
│   │   │   └── glsl/
│   │   │       ├── shader.vert   # 顶点着色器
│   │   │       └── shader.frag   # 片元着色器
│   │   └── hooks/
│   │       └── usePostprocess.jsx
│   │
│   └── helpers/                  # 工具函数
│       ├── global.js
│       └── components/
│           └── Three.jsx
│
├── next.config.js                # Next.js 配置 (PWA, Shader, Audio)
├── tailwind.config.js            # Tailwind CSS 配置
├── postcss.config.js             # PostCSS 配置
├── jsconfig.json                 # JavaScript 路径别名配置
├── Dockerfile                    # Docker 构建文件
└── package.json
```

## Directory Description

| 目录 | 用途 |
|------|------|
| `app/` | Next.js 14 App Router 页面，使用 `dynamic()` 导入 3D 组件 |
| `src/components/canvas/` | React Three Fiber 3D 组件，需使用 `ssr: false` |
| `src/components/dom/` | 常规 React DOM 组件 |
| `src/store/` | Zustand 状态管理，用于跨组件状态共享 |
| `src/templates/` | 可复用的模板组件 (Shader, Scroll, Hooks) |
| `src/helpers/` | 工具函数和辅助组件 |
| `public/` | 直接映射到根路径的静态文件 |

## Key Files

- **Scene.jsx**: 3D 场景主入口，管理 Canvas 内容
- **View.jsx**: tunnel-rat 实现的 Canvas 共享组件
- **PortalHexagram.jsx**: 六芒星传送门 (游戏入口)
- **gameStore.ts**: 游戏状态管理 (phase: 'START' | 'PORTAL' | 'WARP')
