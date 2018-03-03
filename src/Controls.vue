<template>
  <div class="controls" tabindex="-1" @keydown="key">
    <div class="control" @mousedown="reset" title="Press the R key to reset">
      <i class="fas fa-undo"/>
    </div>
    <div class="control" @mousedown="playPause" title="Press the spacebar to toggle">
      <div v-show="!playing"><i class="fas fa-play"/></div>
      <div v-show="playing"><i class="fas fa-pause"/></div>
    </div>
    <div class="control" @mousedown="previous" title="Press ← (left) or ↑ (up) arrow key to step backward">
      <i class="fas fa-step-backward"/>
    </div>
    <div class="control" @mousedown="next" title="Press → (right) or ↓ (down) arrow key to step forward">
      <i class="fas fa-step-forward"/>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    playing: { type: Boolean, required: true },
  },
  methods: {
    reset() {
      this.$emit('reset');
    },
    playPause() {
      this.$emit(this.playing ? 'pause' : 'play');
    },
    previous() {
      this.$emit('previous');
    },
    next() {
      this.$emit('next');
    },
    key({ key }) {
      const keys = {
        r: this.reset,
        R: this.reset,
        ' ': this.playPause,
        ArrowUp: this.previous,
        ArrowLeft: this.previous,
        ArrowDown: this.next,
        ArrowRight: this.next,
      };
      if (keys[key]) keys[key]();
    },
  },
};
</script>

<style lang="sass" scoped>
.controls
  display: flex
  flex-direction: row
  height: 100%
  border: thin black solid
  outline: none

  .control
    border: thin black solid
    font-size: 1.5em
    height: 100%
    flex-grow: 1
    display: flex
    justify-content: center
    align-items: center
    cursor: pointer

</style>
