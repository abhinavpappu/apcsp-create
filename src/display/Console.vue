<template>
  <div class="console" ref="console">
    <div class="item" v-for="item in items"><i class="fa fa-sm fa-chevron-right"/> {{ item }}</div>
  </div>
</template>

<script>
export default {
  props: {
    items: { type: Array, required: true },
  },
  watch: {
    items() {
      this.$nextTick(() => {
        const $console = this.$refs.console;
        $console.scrollTo(0, $console.scrollHeight);
      });
    },
  },
};
</script>

<style lang="sass" scoped>
.console
  padding: 10px 5px
  overflow: auto

  .item
    margin: 5px 0

</style>
