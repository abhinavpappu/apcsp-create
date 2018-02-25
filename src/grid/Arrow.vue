<template>
  <svg class="arrow" :style="arrowStyle" viewBox="0 0 100 100">
    <polygon
      class="triangle"
      points="15 15, 85 50, 15 85"
      :style="triangleStyle"
      ref="triangle"/>
  </svg>
</template>

<script>
export default {
  props: {
    height: { type: Number, required: true },
    width: { type: Number, required: true },
    top: { type: Number, required: true },
    left: { type: Number, required: true },
    direction: { type: Number, required: true },
    animationDuration: { type: Number, default: 400 },
  },
  computed: {
    arrowStyle() {
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
    triangleStyle() {
      const mod = divisor => dividend => {
        while (dividend < 0) {
          dividend += divisor;
        }
        return dividend % divisor;
      };
      const mod360 = mod(360);

      // The following is to make sure that when turning, the shortest path is taken
      // (to make sure it doesn't turn -270deg instead of 90deg)
      const $triangle = this.$refs.triangle;
      const current = $triangle ? $triangle.style.transform : 'rotate(0deg)';
      const rotation = Number(current.substring(current.indexOf('(') + 1, current.indexOf('deg')));
      let newRotation = this.direction;
      if (mod360(rotation + 90) === mod360(this.direction)) { // turn right
        newRotation = rotation + 90;
      } else if (mod360(rotation - 90) === mod360(this.direction)) { // turn left
        newRotation = rotation - 90;
      } else if (mod360(rotation) === mod360(this.direction)) { // no turn
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
.arrow
  position: absolute
  z-index: 1

  .triangle
    transform-origin: center center

</style>
