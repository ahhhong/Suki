<template>
  <!-- Blog 首页：暂时只保留纯白背景；文章内容位于下滑后进入的 BlogContent.vue。 -->
  <div class="blog-home" aria-hidden="true"></div>
</template>

<script>
export default {
  name: 'BlogHome'
}
</script>

<style scoped>
.blog-home {
  position: absolute;
  inset: 0;
  background: #fff;
}
</style>
