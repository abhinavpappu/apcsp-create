<template>
  <div class="options" tabindex="-1" @keydown="keyPress">
    <div class="dimensions">
      <input
        class="horizontal"
        v-model.number="dimensions.horizontal"
        type="number"
        min="1"
        max="20">
      <span class="x">x</span>
      <input
        class="vertical"
        v-model.number="dimensions.vertical"
        type="number"
        min="1"
        max="20">
    </div>
    <div class="arrow-keys">
      <div class="left" @mousedown="arrowKey('left')"><i class="fas fa-arrow-left"/></div>
      <div class="up" @mousedown="arrowKey('up')"><i class="fas fa-arrow-up"/></div>
      <div class="right" @mousedown="arrowKey('right')"><i class="fas fa-arrow-right"/></div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    initialDimensions: {
      type: Object,
      default: () => ({ horizontal: 3, vertical: 3 }),
    },
  },
  data() {
    return {
      dimensions: this.cloneDimensions(this.initialDimensions),
    };
  },
  methods: {
    cloneDimensions({ horizontal, vertical }) {
      return { horizontal, vertical };
    },
    arrowKey(type) {
      this.$emit('arrow-key', type);
    },
    keyPress(e) {
      const keys = {
        ArrowUp: 'up',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };

      if (keys[e.key]) {
        this.arrowKey(keys[e.key]);
      }
    },
  },
  watch: {
    dimensions: {
      deep: true,
      handler() {
        const { horizontal, vertical } = this.dimensions;
        const isValid = value => value >= 1 && value <= 20;
        if (isValid(horizontal) && isValid(vertical)) {
          this.$emit('dimensions-changed', { horizontal, vertical });
        }
      },
    },
  },
};
</script>

<style lang="sass" scoped>
.options
  background: white
  z-index: 2 // to overlay the arrow if it comes out of bounds
  border: black thin solid
  display: flex
  flex-direction: row
  align-items: center
  justify-content: space-around
  outline: none

  .dimensions
    input
      width: 60px
      border: none
      text-align: center
      font-size: 2.5em

    .x
      font-size: 2em
      margin-right: 15px

  .arrow-keys
    font-size: 2.5em
    user-select: none

    .up, .right, .left
      position: relative
      cursor: pointer
      display: inline

    .up
      bottom: 20px

    .left, .right
      top: 20px

</style>
