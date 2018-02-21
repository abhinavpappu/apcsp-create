<template>
  <div
    class="editor"
    tabindex="-1"
    @focus="focusInput"
    ref="editor">
    <textarea
      class="input"
      v-model="inputValue"
      @input="onTextInput"
      @keydown.right.stop.prevent="moveCursor(1, $event.shiftKey)"
      @keydown.left.stop.prevent="moveCursor(-1, $event.shiftKey)"
      @keydown.up.stop.prevent="moveLine(-1, $event.shiftKey)"
      @keydown.down.stop.prevent="moveLine(1, $event.shiftKey)"
      @keydown.tab.stop.prevent="insertText('\t')"
      @keydown.ctrl="specialKey"
      @keydown.meta="specialKey"
      ref="input"/>
    <text-cursor v-bind="cursorAttributes"/>
    <div class="lines">
      <div class="line" v-for="(line, i) in lines">
        <span class="line-number">{{ `${spaces(i + 1)}${i + 1}` }} </span>

        <template v-for="(character, j) in line">
          <span
            v-if="character !== ''"
            class="char"
            :class="{ selected: selectedChars[positionToCursor({ line: i, char: j })]} "
            @mousedown="characterClicked"
            @mousemove="mouseSelect"
            @mouseup="selectionAllowed = false"
            ref="char"
          >{{ character }}</span>

          <span
            v-else
            class="char grow"
            @mousedown="characterClicked"
            @mousemove="mouseSelect"
            @mouseup="selectionAllowed = false"
            ref="char"/>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import TextCursor from './TextCursor.vue';

export default {
  data() {
    return {
      editor: null,
      text: 'abhinavpappuismyname',
      cursor: 0,
      cursorAttributes: {
        top: 0,
        left: 0,
        height: 0,
      },
      inputValue: '  ',
      selectionStart: 0,
      selectionEnd: 0,
      selectionAllowed: false,
    };
  },
  computed: {
    lines() {
      // the new line character is Unicode E000
      // each line ends with E000 when being displayed to fill the remaining space in the line
      return this.text.split('').map(line => `${line}`);
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
      const text = this.text.slice(start, end).replace(//g, '\n');
      return text;
    },
    selectedChars() {
      const [start, end] = this.selected;
      const isSelected = (_, i) => i >= start && i < end;
      return Array(this.text.length).fill(false).map(isSelected);
    },
  },
  methods: {
    spaces(number) {
      return ' '.repeat(this.maxSpaces - String(number).length);
    },
    characters() {
      return Array.from(this.$refs.editor.querySelectorAll('.char'));
    },
    cursorToPosition(cursor) {
      const subtext = this.text.slice(0, cursor);
      const lastNewLine = subtext.lastIndexOf('');
      const line = subtext.split('').length - 1;
      const char = cursor - lastNewLine - 1;
      return { line, char };
    },
    positionToCursor({ line, char }) {
      const [lineN, charN] = (line < 0) ? [0, 0] : [line, char];
      const previousLines = this.lines.slice(0, lineN).join('').length;
      const currentLine = Math.min(charN, (this.lines[lineN] || []).length - 1); // to avoid overflowing to the next line
      return previousLines + currentLine;
    },
    focusInput() {
      this.$refs.input.focus();
    },
    resetInput() {
      this.inputValue = '  ';
      this.$nextTick(() => this.$refs.input.setSelectionRange(1, 1));
    },
    onTextInput() {
      const { input } = this.$refs;
      const value = this.inputValue;
      if (value.length >= 3 && input.selectionStart === value.length - 1) {
        this.insertText(value.slice(1, value.length - 1));
      } else if (value.length === 1) {
        if (input.selectionStart === 0) {
          this.backspace();
        } else {
          this.delete();
        }
      }
      this.resetInput();
    },
    insertText(text) {
      let newText = text;
      const specialCharacters = {
        '\n': '',
        '\t': '  ',
      };
      Object.keys(specialCharacters).forEach(char => {
        newText = newText.replace(new RegExp(char, 'g'), specialCharacters[char]);
      });
      this.text = `${this.text.slice(0, this.cursor)}${newText}${this.text.slice(this.cursor)}`;
      this.cursor += newText.length;
    },
    backspace(amount = 1) {
      if (this.selectedText) {
        this.deleteSelection();
      } else {
        this.text = `${this.text.slice(0, this.cursor - amount)}${this.text.slice(this.cursor)}`;
        this.moveCursor(-amount);
      }
    },
    delete(amount = 1) {
      if (this.selectedText) {
        this.deleteSelection();
      } else {
        this.text = `${this.text.slice(0, this.cursor)}${this.text.slice(this.cursor + amount)}`;
      }
    },
    setCursor(position) {
      this.cursor = Math.min(Math.max(0, position), this.text.length);
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
    mouseSelect({ target: $char }) {
      if (this.selectionAllowed) {
        const index = this.characters().indexOf($char);
        this.addToSelection(index);
        this.setCursor(index);
      }
    },
    moveCursor(amount, shift) {
      if (shift) {
        this.addToSelection(this.cursor + amount);
      } else {
        this.clearSelection();
      }
      this.setCursor(this.cursor + amount);
    },
    moveLine(amount, shift) {
      const { line, char } = this.position;
      const cursor = this.positionToCursor({ line: line + amount, char });
      if (shift) {
        this.addToSelection(cursor);
      } else {
        this.clearSelection();
      }
      this.setCursor(cursor);
    },
    select(start = 0, end = Infinity) {
      const constrain = val => Math.min(Math.max(0, val), this.text.length);
      this.selectionStart = constrain(start);
      this.selectionEnd = constrain(end);
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
      this.text = `${this.text.slice(0, start)}${this.text.slice(end)}`;
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
        this.focusInput();
      }
    },
    cut() {
      this.copy();
      this.deleteSelection();
    },
    specialKey(e) {
      const { key, altKey, shiftKey } = e;
      const keys = {
        c: this.copy,
        x: this.cut,
        a: this.select,
      };

      if (!(altKey || shiftKey) && keys[key]) {
        e.preventDefault();
        e.stopPropagation();
        keys[key]();
      }
    },
  },
  mounted() {
    this.resetInput();
    this.clearSelection();
  },
  watch: {
    cursor() {
      this.$nextTick(() => {
        const $char = this.characters()[this.cursor];
        this.cursorAttributes = {
          top: $char.offsetTop,
          left: $char.offsetLeft,
          height: $char.offsetHeight,
        };
      });
    },
  },
  components: { TextCursor },
};
</script>

<style lang="sass" scoped>
.editor
  font-family: monospace
  font-size: 1.2em
  cursor: text
  user-select: none

  .lines
    .line
      display: flex
      white-space: pre

      .char
        &.grow
          flex-grow: 1
        &.selected
          background-color: #3390FF
          color: white

</style>
