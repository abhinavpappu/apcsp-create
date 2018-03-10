<template>
  <div class="container" tabindex="-1">
    <robot v-bind="robotProps"/>
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
import Robot from './Robot.vue';
import Grid from './Grid.vue';
import GridOptions from './GridOptions.vue';

export default {
  props: {
    delay: { type: Number, default: 400 },
  },
  data() {
    return {
      robot: {
        width: 0,
        height: 0,
        position: [0, 0],
        orientation: 1, // 0 - NORTH, 1 - EAST, 2 - SOUTH, 3 - WEST
      },
      defaultRobot: {
        position: [0, 0],
        orientation: 1,
      },
      dimensions: {
        horizontal: 3,
        vertical: 3,
      },
    };
  },
  computed: {
    robotProps() {
      const [x, y] = this.robot.position;
      return {
        width: this.robot.width,
        height: this.robot.height,
        left: this.getSquareWidth() * x,
        top: this.getSquareHeight() * y,
        orientation: [-90, 0, 90, 180][this.robot.orientation],
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
      this.robot.width = this.getSquareWidth();
      this.robot.height = this.getSquareHeight();
    },
    isValid(position) {
      return this.$refs.grid.canMoveTo(position);
    },
    isGoal(position) {
      return this.$refs.grid.isGoal(position);
    },
    setPosition(position, setDefault = false) {
      this.robot.position = position;
      if (setDefault) this.defaultRobot.position = position;
    },
    setOrientation(orientation, setDefault = false) {
      this.robot.orientation = orientation;
      if (setDefault) this.defaultRobot.orientation = orientation;
    },
    resetToDefault() {
      this.setPosition(this.defaultRobot.position);
      this.setOrientation(this.defaultRobot.orientation);
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
    moveForward(restrict = false, setDefault) {
      const { orientation, position } = this.robot;
      const newPosition = this.applyMovement(position, orientation);
      const isValid = this.isValid(newPosition);
      if (!restrict || isValid) this.setPosition(newPosition, setDefault);
      return isValid;
    },
    turnRight(restrict, setDefault) {
      this.setOrientation(this.applyTurn(this.robot.orientation, 1), setDefault);
    },
    turnLeft(restrict, setDefault) {
      this.setOrientation(this.applyTurn(this.robot.orientation, -1), setDefault);
    },
    arrowKey(type) {
      const actions = {
        left: this.turnLeft,
        right: this.turnRight,
        up: this.moveForward,
      };

      if (actions[type]) {
        actions[type](true, true);
      }
    },
  },
  watch: {
    dimensions: {
      deep: true,
      handler() {
        this.$nextTick(() => this.onResize());
        this.setPosition([0, 0], true);
        this.setOrientation(1, true);
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
  components: { Robot, Grid, GridOptions },
};
</script>

<style lang="sass" scoped>
.container
  position: relative
  display: flex
  flex-direction: column
  outline: none

  .grid
    flex-grow: 5

  .options
    flex-grow: 1

</style>
