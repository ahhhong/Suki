<template>
  <!-- Blog 内容页：从纯白的 Blog 首页向下滚动进入，在此维护文章列表和空状态。 -->
  <div class="archive blog">
    <header class="archive__header blog__header">
      <h2 id="blog-heading" class="archive__title">Blog 专区</h2>
      <button type="button" class="blog__back" :disabled="busy" @click="$emit('back')">返回分类</button>
    </header>
    <!-- Blog 内容文章区：接入文章数据后，在此替换空状态。 -->
    <div class="blog__empty">暂无文章</div>
  </div>
</template>

<script>
export default {
  name: 'BlogContent',
  props: {
    busy: { type: Boolean, default: false }
  },
  emits: ['back']
}
</script>

<style scoped>
/* Blog 内容页样式；共用的页面宽度、留白和标题基础样式位于 App.vue。 */
.blog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 20px;
}

.blog .archive__title {
  font-size: clamp(1.8rem, 4vw, 3.5rem);
  letter-spacing: -0.04em;
}

.blog__back {
  flex: none;
  padding: 10px 16px;
  border: 1px solid #1c1c1c;
  border-radius: 0;
  background: #fff;
  color: #1c1c1c;
  font-size: 1rem;
}

.blog__back:hover { border-color: #bd2944; color: #bd2944; }
.blog__back:focus-visible { outline: 2px solid #bd2944; outline-offset: 4px; }

.blog__empty {
  display: grid;
  flex: 1;
  place-items: center;
  color: #656565;
  font-size: 1rem;
}
</style>
