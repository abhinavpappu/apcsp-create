<template>
  <div class="grid" @mouseup.prevent.stop="isMouseDown = false">
    <div class="row" v-for="(row, i) in grid">
      <div
        class="square"
        :class="[squareTypes[square]]"
        v-for="(square, j) in row"
        @click="toggleSquareType(i, j)"
        @mousedown.prevent.stop="isMouseDown = getToggleType(i, j)"
        @mousemove.prevent.stop="setSquareType(i, j, squareTypes.indexOf(isMouseDown))"/>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    initialGrid: { type: Array, default: null },
    dimensions: { type: Object, default: () => ({ horizontal: 3, vertical: 3 }) },
  },
  data() {
    return {
      grid: this.initialGrid || this.createGrid(this.dimensions),
      squareTypes: ['blank', 'obstacle', 'goal'],
      isMouseDown: false,
    };
  },
  methods: {
    createGrid({ horizontal, vertical }) {
      return Array(vertical).fill(0).map(() => Array(horizontal).fill(0));
    },
    getSquareWidth() {
      return document.querySelector('.square').offsetWidth;
    },
    getSquareHeight() {
      return document.querySelector('.square').offsetHeight;
    },
    getToggleType(row, column) {
      const type = (this.grid[row][column] + 1) % this.squareTypes.length;
      return this.squareTypes[type];
    },
    toggleSquareType(row, column) {
      const type = (this.grid[row][column] + 1) % this.squareTypes.length;
      this.setSquareType(row, column, type);
    },
    setSquareType(row, column, type) {
      if (type >= 0 && type < this.squareTypes.length) {
        // vue.js cannot detect direct modifications of values in an array
        const rowArray = this.grid[row].slice(0);
        rowArray[column] = type;
        this.grid.splice(row, 1, rowArray);
      }
    },
    canMoveTo([x, y]) {
      if (x < 0 || y < 0 || x >= this.grid[0].length || y >= this.grid.length
        || this.squareTypes[this.grid[y][x]] === 'obstacle') {
        return false;
      }
      return true;
    },
  },
  watch: {
    dimensions: {
      deep: true,
      handler() {
        this.grid = this.createGrid(this.dimensions);
      },
    },
  },
};
</script>

<style lang="sass" scoped>

.grid
  display: flex
  flex-direction: column

  .row
    width: 100%
    flex-grow: 1
    display: flex
    flex-direction: row

    .square
      border: black solid thin
      flex-grow: 1

      &.blank
        background-color: white

      &.obstacle
        background-color: black

      &.goal
        background-color: lime
</style>
