<template>
  <div class="container" tabindex="-1">
    <arrow v-bind="arrowProps"/>
    <grid
      :dimensions="dimensions"
      class="grid"
      ref="grid"/>
    <grid-options
      :initial-dimensions="dimensions"
      @dimensions-changed="dimens => dimensions = dimens"
      @arrow-key="type => arrowKey(type)"
      class="options"
      ref="grid-options"/>
  </div>
</template>

<script>
import Arrow from './Arrow.vue';
import Grid from './Grid.vue';
import GridOptions from './GridOptions.vue';

export default {
  props: {
    delay: { type: Number, default: 400 },
  },
  data() {
    return {
      arrow: {
        width: 0,
        height: 0,
        position: [0, 0],
        orientation: 1, // 0 - NORTH, 1 - EAST, 2 - SOUTH, 3 - WEST
      },
      dimensions: {
        horizontal: 3,
        vertical: 3,
      },
    };
  },
  computed: {
    arrowProps() {
      const [x, y] = this.arrow.position;
      return {
        width: this.arrow.width,
        height: this.arrow.height,
        left: this.getSquareWidth() * x,
        top: this.getSquareHeight() * y,
        orientation: [-90, 0, 90, 180][this.arrow.orientation],
        animationDuration: this.delay,
      };
    },
  },
  methods: {
    getSquareWidth() {
      const $grid = this.$refs.grid;
      return $grid ? $grid.getSquareWidth() : 0;
    },
    getSquareHeight() {
      const $grid = this.$refs.grid;
      return $grid ? $grid.getSquareHeight() : 0;
    },
    onResize() {
      this.arrow.width = this.getSquareWidth();
      this.arrow.height = this.getSquareHeight();
    },
    isValid(position) {
      return this.$refs.grid.canMoveTo(position);
    },
    setPosition(position) {
      this.arrow.position = position;
    },
    setOrientation(orientation) {
      this.arrow.orientation = orientation;
    },
    applyMovement(currentPosition, currentOrientation, amount = 1) {
      const [x, y] = currentPosition;
      const moves = [
        [x, y - amount], // 0 - NORTH
        [x + amount, y], // 1 - EAST
        [x, y + amount], // 2 - SOUTH
        [x - amount, y], // 3 - WEST
      ];
      return moves[currentOrientation];
    },
    applyTurn(currentOrientation, direction) {
      // orientation is 0 - NORTH, 1 - EAST, 2 - SOUTH, 3 - WEST
      // direction is 0 - forward, 1 - right, -1 - left, 2 - backward
      let orientation = currentOrientation + direction;
      while (orientation < 0) {
        orientation += 4;
      }
      return orientation % 4;
    },
    moveForward() {
      const { orientation, position } = this.arrow;
      const newPosition = this.applyMovement(position, orientation);
      this.setPosition(newPosition);
      return this.isValid(newPosition);
    },
    turnRight() {
      this.setOrientation(this.applyTurn(this.arrow.orientation, 1));
    },
    turnLeft() {
      this.setOrientation(this.applyTurn(this.arrow.orientation, 1));
    },
    arrowKey(type) {
      const actions = {
        left: this.turnLeft,
        right: this.turnRight,
        up: this.moveForward,
      };
      if (actions[type]) actions[type]();
    },
  },
  watch: {
    dimensions: {
      deep: true,
      handler() {
        this.$nextTick(() => this.onResize());
        this.setPosition([0, 0]);
        this.setOrientation(1);
      },
    },
  },
  created() {
    window.addEventListener('resize', this.onResize);
  },
  mounted() {
    this.$nextTick(() => this.onResize());
  },
  destroyed() {
    window.removeEventListener('resize', this.onResize);
  },
  components: { Arrow, Grid, GridOptions },
};
</script>

<style lang="sass" scoped>
.container
  position: relative
  display: flex
  flex-direction: column

  .grid
    flex-grow: 5

  .options
    flex-grow: 1

</style>
