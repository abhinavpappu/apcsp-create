<template>
  <div
    class="editor"
    tabindex="-1"
    @keydown.right.stop.prevent="moveCursorCharacter(1)"
    @keydown.left.stop.prevent="moveCursorCharacter(-1)"
    @keydown.up.stop.prevent="moveCursorLine(-1)"
    @keydown.down.stop.prevent="moveCursorLine(1)"
    @keydown="typeCharacter($event)">
    <div class="cursor" ref="cursor"/>
    <!-- <div class="line-numbers">
      <div class="number" v-for="(_, index) in lines">{{ index + 1 }}</div>
    </div> -->
    <div class="lines">
      <div class="line" v-for="(line, i) in lines" @mousedown="moveCursor(i, undefined, true)" ref="lines">
        <span class="line-number">{{ i + 1 }} </span>
        <span class="char" v-for="(character, j) in line" @mousedown.stop="moveCursor(i, j)">{{ character }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      lines: ['Hi, this is a', 'fsdijflsjflsdj', 'jkslk', 'a', 'hello'],
      cursor: {
        line: 0,
        character: 0,
      },
    };
  },
  computed: {
    formattedLines() {
      return this.lines.map(line => line.split());
    },
  },
  watch: {
    cursor: {
      handler() {
        this.updateCursorPosition();
      },
      deep: true,
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
    typeCharacter(e) {
      const allowed = '`1234567890-=qwertyuiop[]\\asdfghjkl;\'zxcvbnm,./~!@#$%^&*()_+{}|:"<>? ';
      const special = ['Backspace', 'Delete', 'Enter'];
      if (!(e.ctrlKey || e.altKey) && allowed.split('').concat(special).indexOf(e.key) > -1) {
        this.capCursor();
        const { character, line } = this.cursor;
        const replaceLine = (newLine, l = line) => this.lines.splice(l, 1, newLine);
        const removeLine = (l = line) => this.lines.splice(l, 1);
        const addLine = (newLine, l = line + 1) => this.lines.splice(l, 0, newLine);

        const oldLine = this.lines[line];
        if (allowed.indexOf(e.key.toLowerCase()) > -1) {
          const newLine = `${oldLine.slice(0, character)}${e.key}${oldLine.slice(character)}`;

          replaceLine(newLine);
          this.moveCursorCharacter();
        } else if (e.key === 'Backspace') {
          if (character > 0) {
            const newLine = `${oldLine.slice(0, character - 1)}${oldLine.slice(character)}`;

            replaceLine(newLine);
            this.moveCursorCharacter(-1, false);
          } else if (line > 0) {
            const newLine = `${this.lines[line - 1]}${oldLine}`;
            const previousLineLength = this.lines[line - 1].length;

            replaceLine(newLine, line - 1);
            removeLine();
            this.moveCursor(line - 1, previousLineLength);
          }
        } else if (e.key === 'Delete') {
          if (character < this.lines[line].length) {
            const newLine = `${oldLine.slice(0, character)}${oldLine.slice(character + 1)}`;

            replaceLine(newLine);
          } else if (line < this.lines.length - 1) {
            const newLine = `${oldLine}${this.lines[line + 1]}`;

            replaceLine(newLine);
            removeLine(line + 1);
          }
        } else if (e.key === 'Enter') {
          const newLine1 = `${oldLine.slice(0, character)}`;
          const newLine2 = `${oldLine.slice(character)}`;
          replaceLine(newLine1);
          addLine(newLine2);
          this.moveCursor(line + 1, 0);
        }
      }
    },
  },
};
</script>

<style lang="sass" scoped>
.editor
  display: flex
  font-family: monospace
  font-size: 1.1em
  cursor: text

  &:focus
    outline: none

  .cursor
    position: absolute
    width: 1px
    height: 15px
    background-color: black
    transition: left .05s, top .05s
    animation: blink 1s steps(1, end) infinite

    &.no-blink
      animation: none

  .line-numbers
    width: 20px

    .number
      user-select: none

  .lines
    flex-grow: 1

    .line
      display: flex
      white-space: pre

      .line-number
        -webkit-user-select: none
        user-select: none

@keyframes blink
  0%
    opacity: 1
  50%
    opacity: 0

</style>
