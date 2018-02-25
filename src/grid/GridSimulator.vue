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
  },
  data() {
    return {
      arrow: {
        width: 0,
        height: 0,
        position: [0, 0],
        direction: 1, // 0 - NORTH, 1 - EAST, 2 - SOUTH, 3 - WEST
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
        direction: [-90, 0, 90, 180][this.arrow.direction],
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
    setArrowPosition(position) {
      if (this.$refs.grid.canMoveTo(position)) {
        this.arrow.position = position;
      }
    },
    setArrowDirection(direction) {
      while (direction < 0) {
        direction += 4;
      }
      this.arrow.direction = direction % 4;
    },
    arrowKey(type) {
      if (type === 'left') {
        this.setArrowDirection(this.arrow.direction - 1);
      } else if (type === 'right') {
        this.setArrowDirection(this.arrow.direction + 1);
      } else {
        const [x, y] = this.arrow.position;
        const moves = [
          [x, y - 1], // 0 - NORTH
          [x + 1, y], // 1 - EAST
          [x, y + 1], // 2 - SOUTH
          [x - 1, y], // 3 - WEST
        ];
        this.setArrowPosition(moves[this.arrow.direction]);
      }
    },
  },
  watch: {
    dimensions: {
      deep: true,
      handler() {
        this.$nextTick(() => this.onResize());
        this.arrow.position = [0, 0];
        this.arrow.direction = 1;
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
