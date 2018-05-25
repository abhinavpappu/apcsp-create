<template>
  <div class="container" v-show="show" :style="style">
    <div class="suggestions">
      <div
        v-for="(suggestion, i) in suggestions"
        :key="suggestion"
        class="suggestion"
        :class="{ selected: i === actualSelected }"
      >{{ suggestion }}</div>
    </div>

    <div class="details">
      <div class="template" v-html="template"/>
      <div class="description" v-html="description"/>
    </div>
  </div>
</template>

<script>
import autocomplete from './autocomplete.json';

export default {
  props: {
    show: { type: Boolean, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    start: { type: String, default: '' },
    selected: { type: Number, default: 0 },
  },
  computed: {
    style() {
      return {
        top: `${this.y}px`,
        left: `${this.x}px`,
      };
    },
    suggestions() {
      const start = this.start.toLowerCase();
      if (start) {
        const lower = str => str.toLowerCase();
        const terms = Object.keys(autocomplete)
          .filter(term => lower(term).includes(start))
          .sort((a, b) => lower(a).indexOf(start) - lower(b).indexOf(start));

        return terms;
      }
      return [];
    },
    actualSelected() {
      let index = this.selected;
      while (index < 0) {
        index += this.suggestions.length;
      }
      return index % this.suggestions.length;
    },
    details() {
      return this.suggestions.map(suggestion => autocomplete[suggestion]);
    },
    template() {
      const details = this.details[this.actualSelected];
      if (details) {
        return this.format(details.template, details.variables);
      }
      return '';
    },
    description() {
      const details = this.details[this.actualSelected];
      if (details) {
        return this.format(details.description, details.variables, true);
      }
      return '';
    },
  },
  methods: {
    format(str, variables = [], formatBlocks = false) {
      const variableStyle = "font-family: 'Roboto Mono', monospace; font-style: italic; font-size: .9em";
      if (formatBlocks) {
        variables = variables.concat([
          'first block of statements',
          'second block of statements',
          'block of statements',
          'instructions',
        ]);
      }
      variables.forEach(variable => {
        const regex = new RegExp(`(^|\\W)(${variable})(\\W|$)`, 'g');
        str = str.replace(regex, `$1<span style="${variableStyle}">$2</span>$3`);
      });

      const specials = ['DISPLAY', 'INPUT', 'RANDOM', 'INSERT', 'APPEND', 'REMOVE', 'LENGTH',
        'MOVE_FORWARD', 'ROTATE_RIGHT', 'ROTATE_LEFT', 'CAN_MOVE', 'forward', 'right', 'left',
        'backward', 'true', 'false', 'MOD', 'NOT', 'AND', 'OR'];

      const specialStyle = "font-family: 'Courier New', monospace;";
      specials.forEach(special => {
        const regex = new RegExp(`(^|\\W)(${special})(\\W|$)`, 'g');
        str = str.replace(regex, `$1<span style="${specialStyle}">$2</span>$3`);
      });

      return str;
    },
  },
  watch: {
    suggestions() {
      const isEmpty = this.suggestions.length === 0;
      if (isEmpty) {
        this.$emit('update:show', false);
      }
      this.$emit('input', isEmpty ? {} : this.details[this.actualSelected]);
    },
  },
};
</script>

<style lang="sass" scoped>
.container
  display: flex
  position: fixed
  background: white
  box-shadow: 0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12)
  z-index: 5;

  .suggestion
    width: 150px
    padding: 5px

    &.selected
      background: lightgray

  .details
    width: 500px

    .template
      margin: 5px
      font-size: 1.05em
      white-space: pre;

    .description
      margin: 5px
      font-size: .95em
      font-family: "Roboto", "Helvetica", sans-serif

</style>
