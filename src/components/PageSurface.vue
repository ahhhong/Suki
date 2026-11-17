<template>
  <div class="page-surface" aria-hidden="true"></div>
  <nav class="page-nav" :class="{ 'page-nav--light': light }" aria-label="站点导航">
    <a
      v-for="item in items"
      :key="item.id"
      :href="`#category-${item.id}`"
      :aria-label="`前往 ${item.label}`"
      :aria-current="current === item.id ? 'location' : null"
      :tabindex="busy ? -1 : null"
      @click.prevent="!busy && $emit('navigate', item.id)"
    >{{ item.label }}</a>
  </nav>
</template>

<script>
export default {
  name: 'PageSurface',
  props: {
    items: { type: Array, required: true },
    busy: { type: Boolean, default: false },
    current: { type: String, default: 'home' },
    light: { type: Boolean, default: false }
  },
  emits: ['navigate']
}
</script>

<style scoped>
.page-surface {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(180deg,
      rgb(18 18 22 / 42%) 0,
      rgb(18 18 22 / 26%) 18px,
      rgb(18 18 22 / 11%) 36px,
      rgb(18 18 22 / 3%) 52px,
      rgb(18 18 22 / 0%) 64px),
    rgb(16 15 19 / 2%);
  pointer-events: none;
}

.page-nav {
  position: absolute;
  z-index: 7;
  top: max(2px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: center;
  width: min(260px, calc(100% - 40px));
  gap: 2px;
}

.page-nav a {
  display: grid;
  place-items: center;
  min-height: 44px;
  padding: 8px 4px;
  border-radius: 3px;
  color: #eceaf4;
  font: 550 11px/1.5 system-ui, sans-serif;
  letter-spacing: 0.04em;
  text-decoration: none;
}

.page-nav a:hover { color: #fff; }
.page-nav a:focus-visible { outline: 2px solid #cbb5e4; outline-offset: 2px; }
.page-nav--light a { color: #37323e; }
.page-nav--light a:hover { color: #151218; }
.page-nav--light a:focus-visible { outline-color: #655171; }
</style>
