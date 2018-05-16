<template>
  <div class="container" v-show="show && suggestions.length > 0" :style="{ left, top }">
    <div class="suggestions">
      <div
        v-for="suggestion in suggestions"
        :key="suggestion"
        class="suggestion"
      >{{ suggestion }}</div>
    </div>

    <div class="details">
      <div class="template"></div>
      <div class="description"></div>
    </div>
  </div>
</template>

<script>
import autocomplete from './autocomplete.json';

export default {
  props: {
    show: { type: Boolean, required: true },
    left: { type: Number, required: true },
    top: { type: Number, required: true },
    start: { type: String, default: '' },
  },
  computed: {
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
    details() {
      return this.suggestions.map(suggestion => autocomplete[suggestion]);
    },
  },
  methods: {
    
  },
};
</script>

<style lang="sass" scoped>
.container
  position: fixed

</style>
