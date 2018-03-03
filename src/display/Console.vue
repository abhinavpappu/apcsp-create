<template>
  <div class="console" ref="console">
    <div
      class="item"
      v-for="item in formattedItems"
      :style="item.style">
      <i class="fa fa-sm fa-chevron-right"/> {{ item.text }}
    </div>
  </div>
</template>

<script>
export default {
  props: {
    items: { type: Array, required: true },
  },
  computed: {
    formattedItems() {
      const items = this.items.length === 0 ? [''] : this.items;
      return items.map(item => {
        if (typeof item !== 'object') {
          return {
            text: String(item),
            style: {
              color: 'black',
              fontSize: '1em',
            },
          };
        }
        return item;
      });
    },
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
  border: thin black solid

  .item
    margin: 5px 0

</style>
