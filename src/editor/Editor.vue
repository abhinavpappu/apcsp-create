<template>
  <div
    class="editor"
    ref="editor"
    @mousedown="isMouseDown = $event"
    @mouseup="isMouseDown = false">
    <textarea
      class="input"
      ref="input"
      @keydown.right.stop.prevent="moveCursorCharacter(1)"
      @keydown.left.stop.prevent="moveCursorCharacter(-1)"
      @keydown.up.stop.prevent="moveCursorLine(-1)"
      @keydown.down.stop.prevent="moveCursorLine(1)"
      @keydown.ctrl="specialKey($event)"
      @keydown.meta="specialKey($event)"
      @keydown="typeCharacter($event)"/>
    <div class="cursor" ref="cursor"/>
    <div class="lines">
      <div class="line" v-for="(line, i) in lines" @mousedown="moveCursor(i, undefined, true)" ref="lines">
        <span class="line-number">{{ `${' '.repeat(numSpaces(i + 1))}${i + 1}` }} </span>
        <span
          class="char"
          v-for="(character, j) in line"
          @mousedown.stop="moveCursor(i, j)"
          ref="char"
        >{{ character }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isMouseDown: false,
      editorId: String(Math.random()),
      lines: ['abcdefg', 'hijklmnop', 'qrstuv', 'wxyz'],
      cursor: {
        line: 0,
        character: 0,
      },
      selectedText: '',
    };
  },
  computed: {
    formattedLines() {
      return this.lines.map(line => line.split());
    },
    maxSpaces() {
      return String(this.lines.length).length;
    },
  },
  watch: {
    cursor: {
      handler() {
        this.updateCursorPosition();
      },
      deep: true,
    },
    maxSpaces() {
      this.updateCursorPosition();
    },
  },
  mounted() {
    this.updateCursorPosition();
  },
  methods: {
    setStyles($element, styles) {
      const elementStyles = $element.style;
      Object.keys(styles).forEach(property => {
        elementStyles[property] = styles[property];
      });
    },
    numSpaces(number) {
      return this.maxSpaces - String(number).length;
    },
    replaceLine(newLine, lineNum) {
      this.lines.splice(lineNum, 1, newLine);
    },
    removeLine(lineNum) {
      this.lines.splice(lineNum, 1);
    },
    addLine(newLine, lineNum) {
      this.lines.splice(lineNum, 0, newLine);
    },
    charToLocation(index) {
      const location = { line: 0, char: index };
      while (location.char >= this.lines[location.line].length) {
        location.char -= this.lines[location.line].length;
        location.line++;
      }
      return location;
    },
    locationToChar({ line, char }) {
      let index = char;
      for (let i = 0; i < line; i++) {
        index += this.lines[i].length;
      }
      return index;
    },
    getSelectionRange() {
      const selection = window.getSelection();
      if (selection.type === 'Range') {
        let { anchorNode: start, focusNode: end } = selection;
        [start, end] = [start, end].map(node => ((node.nodeType === 3) ? node.parentElement : node));

        // check if selected text is in this editor
        if (start.dataset.editorId !== this.editorId || end.dataset.editorId !== this.editorId) {
          return false;
        }

        [start, end] = [start, end].map(node => {
          let { dataset: { line, char } } = node;
          [line, char] = [line, char].map(Number);
          return { line, char };
        });

        if (start.line > end.line || (start.line === end.line && start.char > end.char)) {
          [start, end] = [end, start];
        }

        return [start, end];
      }
      return false;
    },
    emptySelection() {
      if (this.getSelectionRange()) {
        window.getSelection().empty();
      }
    },
    onMouseMove(e) {
      if (this.isMouseDown) {
        let [start, end] = [this.isMouseDown.target, e.target];
        [start, end] = [start, end].forEach($element => {
          if ($element.classList.contains('line')) {
            const line = this.$refs.line.indexOf($element);
            const char = $element.querySelector('.char').length;
            return { line, char };
          }
          return this.charToLocation(this.$refs.char.indexOf($element));
        });

        if (start.line > end.line || (start.line === end.line && start.char > end.char)) {
          [start, end] = [end, start];
        }

        this.selectText(start, end);
      }
    },
    selectText(start, end) {


      // const range = this.getSelectionRange();
      // if (range) {
      //   const [start, end] = range;

      //   if (start.line === end.line) {
      //     return this.lines[start.line].slice(start.char, end.char + 1);
      //   }

      //   let text = this.lines[start.line].slice(start.char);
      //   text += `\n${this.lines.slice(start.line + 1, end.line).map(str => `${str}\n`).join('')}`;
      //   text += this.lines[end.line].slice(0, end.char + 1);
      //   return text;
      // }
      // return '';
    },
    updateCursorPosition() {
      this.$nextTick(() => {
        const $lines = this.$refs.lines;
        const $characters = $lines.map($line => Array.from($line.querySelectorAll('.char')));

        let after = false; // whether to display cursor before or after the character
        let { character } = this.cursor;
        if (character >= this.lines[this.cursor.line].length) {
          character = this.lines[this.cursor.line].length - 1;
          after = true;
        }

        if (character >= 0) {
          const $character = $characters[this.cursor.line][character];
          this.setStyles(this.$refs.cursor, {
            left: `${$character.offsetLeft + (after ? $character.offsetWidth : 0)}px`,
            top: `${$character.offsetTop}px`,
            height: `${$character.offsetHeight}px`,
          });
        } else {
          const $number = $lines[this.cursor.line].querySelector('.line-number');
          this.setStyles(this.$refs.cursor, {
            left: `${$number.offsetLeft + $number.offsetWidth}px`,
            top: `${$number.offsetTop}px`,
            height: `${$number.offsetHeight}`,
          });
        }
      });
    },
    moveCursor(line, character = Infinity, cap = false) {
      const constrain = (value, min = -Infinity, max = Infinity) => Math.max(Math.min(value, max), min);
      this.cursor.line = constrain(line, 0, this.lines.length - 1);
      this.cursor.character = constrain(character, 0);
      if (line >= this.lines.length) {
        this.cursor.character = Math.max(this.lines[this.cursor.line].length, this.cursor.character);
      } else if (line < 0) {
        this.cursor.character = 0;
      }
      if (cap) this.capCursor();
      this.pauseCursorBlink();
    },
    capCursor() {
      if (this.cursor.character > this.lines[this.cursor.line].length) {
        this.cursor.character = this.lines[this.cursor.line].length;
      }
    },
    moveCursorCharacter(amount = 1, capCharacter = true) {
      if (capCharacter) this.capCursor();
      const { line, character } = this.cursor;
      this.moveCursor(line, character + amount, capCharacter);
    },
    moveCursorLine(amount = 1, capCharacter = false) {
      if (capCharacter) this.capCursor();
      const { line, character } = this.cursor;
      this.moveCursor(line + amount, character, capCharacter);
    },
    pauseCursorBlink(duration = 500) {
      const { cursor } = this.$refs;
      if (!cursor.classList.contains('no-blink')) {
        cursor.classList.add('no-blink');
        cursor.style.opacity = 1;
        setTimeout(() => {
          cursor.classList.remove('no-blink');
        }, duration);
      }
    },
    deleteSelectedText() {
      const range = this.getSelectionRange();
      if (range) {
        const [start, end] = range;

        if (start.line === end.line) {
          const line = this.lines[start.line];
          this.replaceLine(`${line.slice(0, start.char)}${line.slice(end.char + 1, line.length)}`, start.line);
        } else {
          const newStart = this.lines[start.line].slice(0, start.char);
          const newEnd = this.lines[end.line].slice(end.char + 1);
          this.replaceLine(`${newStart}${newEnd}`, start.line);
          this.removeLine(end.line);
          for (let i = end.line - 1; i > start.line; i--) {
            this.removeLine(i);
          }
        }

        this.emptySelection();
        this.moveCursor(start.line, start.char);
      }
    },
    typeCharacter(e) {
      const allowed = '`1234567890-=qwertyuiop[]\\asdfghjkl;\'zxcvbnm,./~!@#$%^&*()_+{}|:"<>? '.split('');
      const special = 'backspace,delete,enter'.split(',');
      if (!(e.ctrlKey || e.altKey) && allowed.concat(special).indexOf(e.key.toLowerCase()) > -1) {
        // to prevent an additional delete or backspace command when there is selected text
        let noDelete = false;
        if (this.getSelectedText()) {
          this.deleteSelectedText();
          noDelete = true;
        }

        this.capCursor();
        const { character, line } = this.cursor;
        const oldLine = this.lines[line];
        if (allowed.indexOf(e.key.toLowerCase()) > -1) {
          const newLine = `${oldLine.slice(0, character)}${e.key}${oldLine.slice(character)}`;

          this.replaceLine(newLine, line);
          this.moveCursorCharacter();
        } else if (e.key === 'Backspace' && !noDelete) {
          if (character > 0) {
            const newLine = `${oldLine.slice(0, character - 1)}${oldLine.slice(character)}`;

            this.replaceLine(newLine, line);
            this.moveCursorCharacter(-1, false);
          } else if (line > 0) {
            const newLine = `${this.lines[line - 1]}${oldLine}`;
            const previousLineLength = this.lines[line - 1].length;

            this.replaceLine(newLine, line - 1);
            this.removeLine(line);
            this.moveCursor(line - 1, previousLineLength);
          }
        } else if (e.key === 'Delete' && !noDelete) {
          if (character < this.lines[line].length) {
            const newLine = `${oldLine.slice(0, character)}${oldLine.slice(character + 1)}`;

            this.replaceLine(newLine, line);
          } else if (line < this.lines.length - 1) {
            const newLine = `${oldLine}${this.lines[line + 1]}`;

            this.replaceLine(newLine, line);
            this.removeLine(line + 1);
          }
        } else if (e.key === 'Enter') {
          const newLine1 = `${oldLine.slice(0, character)}`;
          const newLine2 = `${oldLine.slice(character)}`;
          this.replaceLine(newLine1, line);
          this.addLine(newLine2, line + 1);
          this.moveCursor(line + 1, 0);
        }
      }
    },
    specialKey(e) {
      const keys = 'c,x,v'.split(',');

      if (!e.altKey && keys.indexOf(e.key) > -1) {
        e.preventDefault();
        e.stopPropagation();

        const selectedText = this.getSelectedText();
        if ((e.key === 'c' || e.key === 'x') && selectedText) {
          const $copyInput = this.$refs['copy-input'];
          $copyInput.value = selectedText;
          if (e.key === 'x') this.deleteSelectedText();
          $copyInput.select();
          document.execCommand('copy');
        } else if (e.key === 'v') {
          this.deleteSelectedText();
        }
      }
    },
  },
};
</script>

<style lang="sass" scoped>
.editor
  font-family: monospace
  font-size: 1.2em
  cursor: text

  &:focus
    outline: none

  .copy-input
    position: fixed;
    top: -9999px;
    left: -9999px;

  .cursor
    position: absolute
    width: 1px
    height: 15px
    background-color: black
    transition: left .05s, top .05s
    animation: blink 1s steps(1, end) infinite

    &.no-blink
      animation: none

  .lines
    .line
      display: flex
      white-space: pre

      .line-number
        user-select: none

@keyframes blink
  0%
    opacity: 1
  50%
    opacity: 0

// #3390FF
</style>
