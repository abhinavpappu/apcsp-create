<template>
  <div
    class="editor"
    tabindex="-1"
    @focus="focus"
    @scroll="updateCursor(true)"
    @mousedown="characterClicked({target: characters().slice(-1)[0]})"
    :style="{ height: Number(height) ? `${height}px` : height }"
    ref="editor">
    <textarea
      class="input"
      v-model="inputValue"
      @input="onTextInput"
      @keydown.right.stop.prevent="moveCursor(1, $event.shiftKey)"
      @keydown.left.stop.prevent="moveCursor(-1, $event.shiftKey)"
      @keydown.up.stop.prevent="moveLine(-1, $event.shiftKey)"
      @keydown.down.stop.prevent="moveLine(1, $event.shiftKey)"
      @keydown.tab.stop.prevent="insertTextAtCursor('\t')"
      @keydown.ctrl="specialKey"
      @keydown.meta="specialKey"
      @blur="hideCursor = true"
      ref="input"/>

    <text-cursor v-bind="cursorAttributes" :hide="hideCursor"/>

    <auto-complete v-bind="autocomplete"/>

    <div class="lines">
      <div class="line" v-for="(row, i) in chars">
        <span
          class="line-number"
          @mousedown.stop="characterClicked({target: characters()[positionToCursor({ line: i, char: 0 })]})"
        >{{ `${spaces(i + 1)}${i + 1}` }}&nbsp;</span>

        <span
          v-for="(character, j) in row"
          class="char"
          :class="character.classes"
          :style="character.styles"
          @mousedown.stop="characterClicked"
          @mousemove="mouseSelect"
          @dblclick="characterDoubleClicked(i, j)"
          ref="char"
        >{{ character.text }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import helper from '../helper';
import highlightCode from './syntaxHighlight';
import TextCursor from './TextCursor.vue';
import AutoComplete from './AutoComplete.vue';

export default {
  props: {
    height: { type: [Number, String], default: '100%' },
    initialText: { type: String, default: '' },
    highlighted: { type: Array, default: () => [] },
    debuggingText: { type: String, default: '' },
  },
  data() {
    return {
      editor: null,
      text: this.initialText,
      cursor: 0,
      cursorAttributes: {
        top: 0,
        left: 0,
        height: 0,
        transition: true,
      },
      hideCursor: true,
      inputValue: '  ',
      selectionStart: 0,
      selectionEnd: 0,
      selectionAllowed: false,
      history: [],
      current: 0,
      lastText: this.initialText,
      autocomplete: {
        show: false,
        left: 0,
        top: 0,
        start: '',
      },
    };
  },
  computed: {
    lines() {
      return this.text.split('\n').map(line => `${line}\n`);
    },
    position: {
      get() {
        return this.cursorToPosition(this.cursor);
      },
      set(position) {
        this.setCursor(this.positionToCursor(position));
      },
    },
    maxSpaces() {
      return String(this.lines.length).length;
    },
    selected() {
      const [start, end] = [this.selectionStart, this.selectionEnd];
      return (start > end) ? [end, start] : [start, end];
    },
    selectedText() {
      const [start, end] = this.selected;
      return this.text.slice(start, end);
    },
    colors() {
      return highlightCode(this.text);
    },
    chars() {
      return this.lines.map((line, i) => line.split('').map((char, j) => {
        const cursor = this.positionToCursor({ line: i, char: j });
        const isEnd = char === '\n';

        let text = char;
        const highlight = this.highlighted[0];
        if (isEnd && highlight && this.cursorToPosition(highlight).line === i) {
          text = ` ${this.debuggingText}`;
        }

        const classes = isEnd ? { grow: true } : {
          selected: helper.isInRange(cursor, this.selected[0], this.selected[1]),
          highlighted: helper.isInRange(cursor, this.highlighted[0], this.highlighted[1]),
        };

        const styles = {
          color: 'black',
        };

        Object.keys(this.colors).forEach(color => {
          this.colors[color].forEach(range => {
            if (helper.isInRange(cursor, range[0], range[1])) {
              styles.color = color;
            }
          });
        });

        return {
          text,
          classes,
          styles,
        };
      }));
    },
    indentation() {
      const countSpaces = line => (line.match(/^ */) || [''])[0].length;
      return this.lines.map(countSpaces).map(num => ' '.repeat(num));
    },
  },
  methods: {
    setText(text) {
      this.text = text;
      this.$emit('input', text);
    },
    spaces(number) {
      return ' '.repeat(this.maxSpaces - String(number).length);
    },
    characters() {
      return Array.from(this.$refs.editor.querySelectorAll('.char'));
    },
    cursorToPosition(cursor) {
      const subtext = this.text.slice(0, cursor);
      const lastNewLine = subtext.lastIndexOf('\n');
      const line = subtext.split('\n').length - 1;
      const char = cursor - lastNewLine - 1;
      return { line, char };
    },
    positionToCursor({ line, char }) {
      const [lineN, charN] = (line < 0) ? [0, 0] : [line, char];
      const previousLines = this.lines.slice(0, lineN).join('').length;
      const currentLine = Math.min(charN, (this.lines[lineN] || []).length - 1); // to avoid overflowing to the next line
      return previousLines + currentLine;
    },
    constrain(value, min = 0, max = this.text.length) {
      return Math.min(Math.max(min, value), max);
    },
    focus() {
      this.hideCursor = false;
      this.$refs.input.focus();
    },
    resetInput() {
      this.inputValue = '  ';
      this.$nextTick(() => this.$refs.input.setSelectionRange(1, 1));
    },
    onTextInput() {
      const { input } = this.$refs;
      let value = this.inputValue;
      if (value.length >= 3 && input.selectionStart === value.length - 1) {
        value = value.slice(1, value.length - 1);
        this.deleteSelection();
        const { line, char } = this.position;
        if (value === '\n') { // keep indentation when adding lines
          value += this.indentation[line];
          if (this.text[this.cursor - 1] === '{') value += '  '; // extra indent if {
        }
        if (value === '}' && this.lines[line].slice(0, char).match(/^  +$/)) { // dedent if }
          this.deleteTextAtCursor(this.cursor - 2);
        }
        this.insertTextAtCursor(value);
      } else if (value.length === 1) {
        if (input.selectionStart === 0) {
          this.backspace();
        } else {
          this.delete();
        }
      }
      this.resetInput();

      let position = this.cursor - 1;
      let start = '';
      while (position >= 0 && this.text[position].match(/^[a-z]$/i)) {
        start = this.text[position] + start;
        position--;
      }
      const { left, top, height } = this.cursorAttributes;
      this.autocomplete = {
        show: true,
        left,
        top: top + height,
        start,
      };
      console.log(start);
    },
    insertText(text, location, save = true) {
      let newText = text;
      const specialCharacters = {
        '\t': '  ',
      };
      Object.keys(specialCharacters).forEach(char => {
        newText = newText.replace(new RegExp(char, 'g'), specialCharacters[char]);
      });
      this.setText(`${this.text.slice(0, location)}${newText}${this.text.slice(location)}`);
      if (save) this.saveChanges();
      return newText;
    },
    insertTextAtCursor(text) {
      const newText = this.insertText(text, this.cursor);
      this.moveCursor(newText.length);
    },
    deleteText(from, to, save = true) {
      const [start, end] = (from > to ? [to, from] : [from, to]).map(x => this.constrain(x));
      const deletedText = this.text.slice(start, end);
      this.setText(`${this.text.slice(0, start)}${this.text.slice(end)}`);
      if (save) this.saveChanges();
      return deletedText;
    },
    deleteTextAtCursor(to) {
      const deletedText = this.deleteText(this.cursor, to);
      this.moveCursor((to < this.cursor) ? -deletedText.length : 0);
    },
    backspace(amount = 1) {
      if (this.selectedText) {
        this.deleteSelection();
      } else {
        if (this.text.substr(this.cursor - 2, 2) === '  ' && amount === 1) amount = 2; // delete tab
        this.deleteTextAtCursor(this.cursor - amount);
      }
    },
    delete(amount = 1) {
      if (this.selectedText) {
        this.deleteSelection();
      } else {
        this.deleteTextAtCursor(this.cursor + amount);
      }
    },
    setCursor(location) {
      this.cursor = this.constrain(location);
    },
    characterClicked({ target: $char, shiftKey }) {
      const index = this.characters().indexOf($char);
      this.setCursor(index);
      if (!this.selectedText || shiftKey) {
        this.selectionAllowed = true;
      }
      if (!shiftKey) {
        this.clearSelection();
      }
    },
    characterDoubleClicked(line, char) {
      const index = this.positionToCursor({ line, char });
      let [start, end] = Array(2).fill(index);
      let stop = false;
      for (let i = index; i < this.text.length && !stop; i++) {
        end = i;
        if (!this.text[i].match(/^\w$/)) stop = true;
      }
      stop = false;
      for (let i = index; i >= 0 && !stop; i--) {
        start = i;
        if (!this.text[i].match(/^\w$/)) stop = true;
      }
      this.select(start + 1, end); // start is inclusive, end is not, so start + 1
    },
    mouseSelect({ target: $char }) {
      if (this.selectionAllowed) {
        const index = this.characters().indexOf($char);
        this.addToSelection(index);
        this.setCursor(index);
      }
    },
    moveCursor(amount, shift = false) {
      const cursor = this.cursor + amount;
      this.setCursor(cursor);
      if (shift) {
        this.addToSelection(cursor);
      } else {
        this.clearSelection();
      }
    },
    moveLine(amount, shift) {
      const { line, char } = this.position;
      const cursor = this.positionToCursor({ line: line + amount, char });
      this.setCursor(cursor);
      if (shift) {
        this.addToSelection(cursor);
      } else {
        this.clearSelection();
      }
    },
    select(start = 0, end = Infinity) {
      this.selectionStart = this.constrain(start);
      this.selectionEnd = this.constrain(end);
    },
    addToSelection(index) {
      this.select(this.selectionStart, index);
    },
    clearSelection() {
      // allows addToSelection to create new selection if no selection exists
      this.selectionStart = this.cursor;
      this.selectionEnd = this.cursor;
    },
    deleteSelection() {
      const [start, end] = this.selected;
      this.deleteText(start, end);
      this.clearSelection();
      this.setCursor(start);
    },
    copyToClipboard(text) {
      const $editor = this.$refs.editor;
      const $copyInput = document.createElement('textarea');
      $copyInput.style.position = 'fixed';
      $copyInput.style.left = '-9999px';
      $copyInput.value = text;
      $editor.appendChild($copyInput);
      $copyInput.select();
      document.execCommand('copy');
      $editor.removeChild($copyInput);
    },
    copy() {
      if (this.selectedText) {
        this.copyToClipboard(this.selectedText);
        this.focus();
      }
    },
    cut() {
      this.copy();
      this.deleteSelection();
    },
    specialKey(e) {
      const { altKey, shiftKey } = e;
      const key = e.key.toLowerCase();
      const keys = {
        c: this.copy,
        x: this.cut,
        a: this.select,
        z: this.undo,
        y: this.redo,
      };
      const shiftKeys = {
        z: this.redo,
      };

      const prevent = () => { e.preventDefault(); e.stopPropagation(); };
      if (!(altKey || shiftKey) && keys[key]) {
        prevent();
        keys[key]();
      } else if (!altKey && shiftKey && shiftKeys[key]) {
        prevent();
        shiftKeys[key]();
      }
    },
    diff(oldText, newText) {
      const subDiff = (long, short) => {
        const lengthDiff = long.length - short.length;
        let i = 0;
        while (long[i] === short[i]) i++;
        return { start: i, text: long.slice(i, i + lengthDiff) };
      };

      let diff = false;
      if (newText.length > oldText.length) { // insert
        diff = subDiff(newText, oldText);
        diff.type = '+';
      } else if (newText.length < oldText.length) { // delete
        diff = subDiff(oldText, newText);
        diff.type = '-';
      }
      return diff;
    },
    saveChanges() {
      const diff = this.diff(this.lastText, this.text);
      if (diff) {
        if (this.current !== 0) {
          this.history = this.history.slice(this.current);
          this.current = 0;
        }
        const { start, text, type } = diff;
        const saveText = `${start}${type}${text}`;
        this.history.unshift(saveText);
        this.lastText = this.text;
      }
    },
    reverseDiff(diff) {
      const type = diff[diff.search(/[+-]/)];
      const newType = (type === '+') ? '-' : '+';
      return diff.replace(type, newType);
    },
    do(diff) {
      // only gets the first + or - (since there could be more in the user's text)
      const typeIndex = diff.search(/[+-]/);
      const type = diff[typeIndex];
      const text = diff.slice(typeIndex + 1);
      const start = Number(diff.slice(0, typeIndex));
      if (type === '+') {
        this.insertText(text, start, false);
        this.setCursor(start + text.length);
      } else {
        this.deleteText(start, start + text.length, false);
        this.setCursor(start);
      }
      this.lastText = this.text;
    },
    undo() {
      const { history, current } = this;
      if (history[current]) {
        const diff = history[current];
        this.do(this.reverseDiff(diff));
        this.current++;
      }
    },
    redo() {
      const { history, current } = this;
      if (history[current - 1]) {
        const diff = history[current - 1];
        this.do(diff);
        this.current--;
      }
    },
    updateCursor(notransition = false) {
      this.$nextTick(() => {
        const { top, left, height } = this.characters()[this.cursor].getBoundingClientRect();
        this.cursorAttributes = { top, left, height };
        this.cursorAttributes.transition = !notransition;
      });
    },
    mouseUp() {
      this.selectionAllowed = false;
    },
  },
  created() {
    window.addEventListener('mouseup', this.mouseUp);
  },
  mounted() {
    this.resetInput();
    this.clearSelection();
  },
  destroyed() {
    window.removeEventListener('mouseup', this.mouseUp);
  },
  watch: {
    cursor() {
      this.updateCursor();
    },
    maxSpaces() {
      this.updateCursor(true);
    },
  },
  components: { TextCursor, AutoComplete },
};
</script>

<style lang="sass" scoped>
.editor
  font-family: "Roboto Mono", monospace
  font-size: .9em
  cursor: text
  user-select: none
  overflow: auto

  .input
    position: fixed
    top: -9999px

  .lines
    .line
      display: flex
      white-space: pre

      .char
        &.grow
          flex-grow: 1
          color: lightslategray !important
        &.selected
          background-color: #3390FF
          color: white !important // to override syntax highlighting
        &.highlighted
          background-color: yellow

</style>
