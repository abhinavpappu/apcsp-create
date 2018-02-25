<template>
  <div id="app">
    <editor class="code-editor"/>
    <grid-simulator class="grid-simulator"/>
    <div class="console">b</div>
  </div>
</template>

<script>
import Editor from './editor/Editor.vue';
import GridSimulator from './grid/GridSimulator.vue';

export default {
  methods: {
    run()
  },
  components: { Editor, GridSimulator },
};
</script>

<style lang="scss" scoped>
// Using SCSS instead of SASS because it supports multi-line statements
// which make CSS grid easier to visualize

#app {
  font-family: 'Roboto', sans-serif;
  height: 100%;
  display: grid;
  grid-template:
    "  .   .       .   .         .  " 10px
    "  .   editor  .   grid-sim  .  " 6fr
    "  .   editor  .   console   .  " 4fr
    "  .   .       .   .         .  " 10px
    / 10px  1fr   20px   1fr    10px;

  .code-editor {
    grid-area: editor;
  }

  .grid-simulator {
    grid-area: grid-sim;
  }

  .grid-options {
    grid-area: options;
  }

  .console {
    grid-area: console;
  }
}

</style>
