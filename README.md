# 小站前端部分
页面在同一文档中依次排列：全屏 WebP 开场、正文第一屏、正文第二屏。每屏高度为一个视口，滚动条隐藏，没有跳过开场按钮。

## 运行

```powershell
npm.cmd install
npm.cmd run serve
```

构建：`npm.cmd run build`。状态测试：`npm.cmd test`（Node.js 20 或更新版本）。
macOS / Linux 使用 `npm` 替代 `npm.cmd`。

## 文件位置

| 文件 | 内容 |
| --- | --- |
| `src/App.vue` | 三屏结构、图片视觉层、输入路由、焦点管理和样式 |
| `src/paging/gesture.mjs` | 累计幅度、方向判定、每个手势最多翻一屏 |
| `src/paging/slide-pager.mjs` | 淡出、遮罩、唯一跳转、带方向的滑入和动画清理 |
| `src/intro/sequence.mjs` | 0～1 开场进度、相邻帧透明度和最终帧退出条件 |
| `src/intro/image-cache.mjs` | 加载、解码、预加载和错误重试 |
| `public/intro/01.webp`～`10.webp` | 按原目录 `1.png`～`10.png` 编号播放的无损 WebP |
| `public/index.html` | 第一张图片的高优先级预加载 |
| `src/main.js` | Vue 挂载入口 |
| `tests/sequence.test.mjs`、`tests/gesture.test.mjs` | 开场与滚轮手势测试 |

正文替换 `src/App.vue` 中 `content-one` 和 `content-two` 区块内部的标题内容即可。请把动画内容保留在各自的 `.slide__visual` 中，区块本身不做位移动画。

## 哪一段判定翻页

`src/App.vue` 的 `feed()` 区分开场和正文。开场将输入交给 `sequence.input()`，只有最终帧已经绘制后的新向下输入才返回 `exit`。

正文把滚轮输入交给 `src/paging/gesture.mjs` 的 `push()`：

```js
if (Math.sign(delta) !== Math.sign(total)) total = 0
total += delta
if (Math.abs(total) < threshold) return 0
consumed = true
total = 0
return Math.sign(delta)
```

`threshold` 默认 90 像素；两次输入相隔超过 `idleMs = 220` 毫秒才视为新手势。
手势消费后，剩余输入不会再次翻页。转场期间 `block()` 持续记录输入时间，因此转场后的同一串惯性尾流也被忽略。
方向反转会清空尚未触发翻页的累计值。每次只能请求 `当前屏 + 1` 或 `当前屏 - 1`，第一页和最后一页的边界不会继续跳转。

## 哪一行执行跳转

`src/paging/slide-pager.mjs` 的 `goTo()` 中标有「唯一的翻页跳转」：

```js
const top = sections[target].getBoundingClientRect().top + window.scrollY
window.scrollTo({ top, left: 0, behavior: 'instant' })
```

执行顺序：

1. 旧视觉层淡出，固定在视口上的全屏黑色遮罩淡入至 `opacity: 1`。
2. 遮罩不透明时准备目标视觉层。返回开场会在这里将显示进度和目标进度都重置为 0，并恢复第一张图片。
3. 执行上述唯一一次 `scrollTo()`。滚动位置直接到达目标区块，不做真实平滑滚动。
4. 目标视觉层从 `translateY(32px)`（向下翻页）或 `translateY(-32px)`（向上翻页）恢复到 0 并淡入，同时淡去遮罩。

动画只改变视觉层和遮罩的 `opacity` / `transform`。初始化与窗口尺寸变化的 `align()` 单独用于对齐当前屏，不属于翻页转场。
转场使用浏览器 Web Animations API，并等待 `Animation.finished`；卸载时取消动画和 RAF、移除输入和媒体查询监听、恢复文档滚动锁和历史滚动设置。

## 开场进度

滚轮输入统一为像素后，每次限制在 ±160，并按 `target += delta / 2800` 累积目标。RAF 平滑推进显示进度 `p`。
`position = p * 9`，`lower = min(floor(position), 8)`，`mix = position - lower`，相邻两张透明度分别为 `1 - mix` 和 `mix`。
画面采用 `plus-lighter` 混合，防止交叉淡入淡出时额外变暗；图片未解码时不改变当前画面和显示进度，输入目标仍可累积。

方向键及 PageUp / PageDown 支持前进或后退。正文长按产生的重复按键不会继续翻页。触屏使用单指纵向滑动。
系统减少动态效果模式关闭缓动、淡入淡出和位移，保留遮罩下的瞬时定位与相同的边界规则，并响应系统偏好的实时变化。

参考：[Animation.finished](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finished)、[window.scrollTo](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo)、[Image.decode](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode)。
