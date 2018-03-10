<template>
  <svg class="robot" :style="robotStyle" viewBox="0 0 100 100">
    <polygon
      class="arrow"
      points="15 15, 85 50, 15 85"
      :style="arrowStyle"
      ref="arrow"/>
  </svg>
</template>

<script>
export default {
  props: {
    height: { type: Number, required: true },
    width: { type: Number, required: true },
    top: { type: Number, required: true },
    left: { type: Number, required: true },
    orientation: { type: Number, required: true },
    animationDuration: { type: Number, default: 400 },
  },
  computed: {
    robotStyle() {
      const addPx = style => `${style}px`;
      const duration = `${this.animationDuration / 1000}s`;

      return {
        height: addPx(this.height),
        width: addPx(this.width),
        top: addPx(this.top),
        left: addPx(this.left),
        transition: `top ${duration}, left ${duration}`,
      };
    },
    arrowStyle() {
      const mod = divisor => dividend => {
        while (dividend < 0) {
          dividend += divisor;
        }
        return dividend % divisor;
      };
      const mod360 = mod(360);

      // The following is to make sure that when turning, the shortest path is taken
      // (to make sure it doesn't turn -270deg instead of 90deg)
      const $arrow = this.$refs.arrow;
      const current = $arrow ? $arrow.style.transform : 'rotate(0deg)';
      const rotation = Number(current.substring(current.indexOf('(') + 1, current.indexOf('deg')));
      let newRotation = this.orientation;
      if (mod360(rotation + 90) === mod360(this.orientation)) { // turn right
        newRotation = rotation + 90;
      } else if (mod360(rotation - 90) === mod360(this.orientation)) { // turn left
        newRotation = rotation - 90;
      } else if (mod360(rotation) === mod360(this.orientation)) { // no turn
        newRotation = rotation;
      }
      // else it is turning 180deg and it doesn't matter which way it turns

      return {
        transform: `rotate(${newRotation}deg)`,
        transition: `transform ${this.animationDuration / 1000}s`,
      };
    },
  },
};
</script>

<style lang="sass" scoped>
.robot
  position: absolute
  z-index: 1

  .arrow
    transform-origin: center center

</style>
