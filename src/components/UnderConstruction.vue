<template>
  <div class="under-construction">
    <svg class="under-construction__icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M16 34v18m32-18v18M10 52h12m20 0h12" stroke="currentColor" stroke-width="3" />
      <path d="M8 14h48v20H8z" fill="#f4bd42" />
      <path d="m8 26 12-12h8L8 34zm20 8 20-20h8L36 34zm20 0 8-8v8z" fill="currentColor" />
      <path d="M8 14h48v20H8z" stroke="currentColor" stroke-width="2" />
    </svg>
    <h2>正在施工中</h2>
  </div>
</template>

<script>
export default {
  name: 'UnderConstruction'
}
</script>

<style scoped>
.under-construction {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 20px;
  padding: 64px 24px;
  color: #1c1c1c;
  text-align: center;
}

.under-construction__icon { width: 72px; height: 72px; }
.under-construction h2 { margin: 0; font-size: 1.4rem; font-weight: 600; }
</style>
