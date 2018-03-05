<template>
  <div
    class="cursor"
    :style="style"
    :class="{'no-blink': paused, hide, transition}"/>
</template>

<script>
export default {
  props: {
    top: { type: Number, required: true },
    left: { type: Number, required: true },
    height: { type: Number, required: true },
    hide: { type: Boolean, default: false },
    transition: { type: Boolean, default: true },
  },
  data() {
    return {
      paused: false,
    };
  },
  computed: {
    style() {
      const addPx = val => `${val}px`;
      let { top, left, height } = this;
      [top, left, height] = [top, left, height].map(addPx);
      return { top, left, height };
    },
  },
  methods: {
    pauseBlinking() {
      if (!this.paused) {
        this.paused = true;
        setTimeout(() => { this.paused = false; }, 200);
      }
    },
  },
  watch: {
    top() {
      this.pauseBlinking();
    },
    left() {
      this.pauseBlinking();
    },
  },
};
</script>

<style lang="sass" scoped>
.cursor
  position: absolute
  width: 1px
  height: 15px
  background-color: black
  animation: blink 1s steps(1, end) infinite

  &.no-blink
    animation: none

  &.hide
    display: none

  &.transition
    transition: left .05s, top .05s

@keyframes blink
  0%
    opacity: 1
  50%
    opacity: 0

</style>
