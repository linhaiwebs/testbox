# 图片资源说明

## 📁 文件夹结构

```
frontend/src/assets/
├── css/           # CSS 样式文件夹
│   └── style.css       # 主样式文件
├── picture/       # 图片资源文件夹（请将图片放在这里）
└── fonts/         # 字体资源文件夹（如需要）
```

## 🖼️ 需要的图片文件

请将以下图片文件放置在 `frontend/src/assets/picture/` 文件夹中：

### 主要图片
- `zcnhds.webp` - Logo 图片（在您的 HTML 中引用的）

## 📝 使用说明

1. 创建文件夹结构（已自动创建）
2. 将对应的图片文件放入 `frontend/src/assets/picture/` 文件夹
3. 重新启动前端服务即可看到完整效果

## 🔗 访问路径

所有静态资源现在通过 import 方式引入，例如：
- 图片：`getImage('zcnhds')` 会自动加载 `zcnhds.webp` 文件

## 📋 图片格式支持

支持的图片格式：
- PNG (.png)
- JPEG (.jpg, .jpeg)
- GIF (.gif)
- SVG (.svg)
- WebP (.webp)