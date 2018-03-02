<template>
  <div id="app">
    <editor
      class="code-editor"
      :initial-text="rawCode"
      @input="text => rawCode = text"
      ref="editor"/>

    <grid-simulator
      class="grid-simulator"
      :delay="400"
      ref="grid-simulator"/>

    <console :items="displayed"/>
  </div>
</template>

<script>
import safeEval from './eval';
import Editor from './editor/Editor.vue';
import GridSimulator from './display/GridSimulator.vue';
import Console from './display/Console.vue';

export default {
  data() {
    return {
      rawCode:
`REPEAT 3 TIMES {
  IF (CAN_MOVE(forward)) {
    MOVE_FORWARD()
  }
  ELSE {
    ROTATE_RIGHT()
    MOVE_FORWARD()
    ROTATE_LEFT()
  }
}`,
      states: [],
      currentState: 0,
      paused: false,
      delay: 400,
      displayed: [],
    };
  },
  computed: {
    code() {
      // adding line numbers first to ensure accurate highlighting when debugging
      return this.convertSyntax(this.addLineNumbers(this.rawCode));
    },
  },
  methods: {
    addLineNumbers(code) {
      const lines = code.split('\n');
      const commands = ['DISPLAY', 'INPUT', 'RANDOM', 'INSERT', 'APPEND', 'REMOVE', 'LENGTH',
        'MOVE_FORWARD', 'ROTATE_RIGHT', 'ROTATE_LEFT', 'CAN_MOVE'];

      const newLines = lines.map((line, row) => {
        let newLine = line;

        // searching from right to left to preserve the column indexes when modifying the string
        for (let i = newLine.length - 1; i >= 0; i--) {
          const sub1 = newLine.slice(0, i);
          const sub2 = newLine.slice(i);

          // check if command is at the beginning of the substring
          if (sub2.match(new RegExp(`^(${commands.join('|')})`))) {
            const column = sub1.length;
            const length = sub2.indexOf(')') + 1;
            const insertIndex = column + length;
            newLine = `${newLine.slice(0, insertIndex)}(${row})(${column})(${length})${newLine.slice(insertIndex)}`;
          }
        }

        return newLine;
      });
      return newLines.join('\n');
    },
    convertSyntax(code) {
      // the replacements happen in order, so later replacements occur after the prior ones are applied
      // case insensitive
      /* eslint-disable no-useless-escape */
      const replacements = [
        [/<-/g, '='],
        [/←/g, '='],
        [/(\n|;|^)\s*((var|let|const)\s+)?([a-z]\w*)\s*=\s*((.|\s)*?)(\n|;)/gi,
          '$1 var $4 = $5;\n'], // allow declaring variables without var/let/const
        [/\s+mod\s+/gi, ' % '],
        [/≠/g, '!='],
        [/≥/g, '>='],
        [/≤/g, '<='],
        [/(\w+)\[([^,\[\]]+)\]/g, '$1[($2) - 1]'], // subtract one from array indexing (1-indexed)
        [/not\s+/gi, '!'],
        [/\s+and\s+/gi, ' && '],
        [/\s+or\s+/gi, ' || '],
        [/if\s*\(((.|\s)*?)\)\s*{/gi, 'if ($1) {'],
        [/}\s*else\s*{/gi, '} else {'],
        [/repeat\s+(\w+)\s+times\s*{/gi, 'for (let i = 0; i < $1; i++) {'],
        [/repeat\s+until\s*\(((.|\s)*?)\)\s*{/gi, 'while (!($1))'],
        [/for\s+each\s+([a-z]\w*)\s+in\s+([a-z]\w*)\s*{/gi,
          'for (var i = 0, $1 = $2[0]; i < $2.length; $1 = $2[++i])'],
        [/procedure\s+(\w*)\s*\(((.|\s)*?)\)\s*{/gi, 'function $1($2) {'],
        [/while\s*\(((.|\s)*?)\)\s*{/gi, 'while ($_globals.continue && ($1)) {'], // prevent infinite loops
        [/for\s*\(((.|\s)*?);((.|\s)*?);((.|\s)*?)\)\s*{/gi, // prevent infinite loops
          'for ($1; $_globals.continue && ($3); $5) {'],
        [/function\s+(\w*)\s*\(((.|\s)*?)\)\s*{/gi,
          'function $1($2) { if(!$_globals.continue) return false;'], // prevent infinite loops from recursion
        [/(\s+)return /gi, '$1return '], // to uncapitalize it if necessary
      ];
      /* eslint-enable no-useless-escape */
      let newCode = code;
      replacements.forEach(([regex, replacement]) => {
        newCode = newCode.replace(regex, replacement);
      });
      return newCode;
    },
    run() {
      const $grid = this.$refs['grid-simulator'];
      $grid.resetToDefault();
      this.states = [];

      let { position, orientation } = $grid.arrow;
      let display = [];
      const globals = {
        continue: true,
      };

      const saveState = (line = 0, column = 0, length = 0, text = '') => {
        if (globals.continue) {
          this.states.push({
            position: position.slice(0),
            orientation,
            line,
            column,
            length,
            text,
            display,
          });
          if (!$grid.isValid(position)) {
            globals.continue = false;
          }
        }
        if (this.states.length > 10000) globals.continue = false;
      };
      saveState();

      const DISPLAY = text => line => column => length => {
        const displayText = String(text);
        display = display.concat(displayText);
        saveState(line, column, length, displayText);
      };

      const RANDOM = (a, b) => line => column => length => {
        const random = Math.floor((Math.random() * ((b - a) + 1)) + a);
        saveState(line, column, length, String(random));
        return random;
      };

      const INSERT = (list, i, value) => line => column => length => {
        list.splice(i, 0, value);
        saveState(line, column, length, `[${list}]`);
      };

      const APPEND = (list, value) => line => column => length => {
        list.push(value);
        saveState(line, column, length, `[${list}]`);
      };

      const REMOVE = (list, i) => line => column => length => {
        list.splice(i, 1);
        saveState(line, column, length, `[${list}]`);
      };

      const LENGTH = list => line => column => length => {
        saveState(line, column, length, String(list.length));
        return list.length;
      };

      const MOVE_FORWARD = () => line => column => length => {
        position = $grid.applyMovement(position, orientation);
        saveState(line, column, length);
      };

      const ROTATE_RIGHT = () => line => column => length => {
        orientation = $grid.applyTurn(orientation, 1);
        saveState(line, column, length);
      };

      const ROTATE_LEFT = () => line => column => length => {
        orientation = $grid.applyTurn(orientation, -1);
        saveState(line, column, length);
      };

      const CAN_MOVE = direction => line => column => length => {
        const newOrientation = $grid.applyTurn(orientation, direction);
        const newPosition = $grid.applyMovement(position, newOrientation);
        const isValid = $grid.isValid(newPosition);
        saveState(line, column, length, String(isValid));
        return isValid;
      };

      safeEval(this.code, {
        forward: 0,
        right: 1,
        left: -1,
        backward: 2,
        $_globals: globals,
        DISPLAY,
        RANDOM,
        INSERT,
        APPEND,
        REMOVE,
        LENGTH,
        MOVE_FORWARD,
        ROTATE_RIGHT,
        ROTATE_LEFT,
        CAN_MOVE,
      });

      this.playStates();
    },
    playStates(start = this.currentState) {
      // Essentially a for loop with a time delay between each iteration
      // Delay is in milliseconds
      // If using a function for delay, note that the delay is between current iteration
      // and next, not previous and current
      // Return false in func to stop loop
      const delayedFor = (initial, condition, step, func, delay, callback) => {
        if (typeof initial === 'function') initial = initial();
        const continueLoop = (typeof condition === 'function') ? condition(initial)
          : (step >= 0) ? initial < condition
            : (step < 0) ? initial > condition
              : false;
        if (continueLoop) {
          if (func(initial) !== false) {
            setTimeout(() => {
              const current = (typeof step === 'function') ? step(initial) : initial + step;
              delayedFor(current, condition, step, func, delay, callback);
            }, (typeof delay === 'function') ? delay(initial) : delay);
          }
        } else if (callback) {
          callback();
        }
      };

      const $grid = this.$refs['grid-simulator'];
      const $editor = this.$refs.editor;
      delayedFor(start, this.states.length, 1, i => {
        if (this.paused) return false; // ends loop
        const state = this.states[i];
        $grid.setPosition(state.position);
        $grid.setOrientation(state.orientation);
        $editor.selectFromPosition({ line: state.line, char: state.column }, state.length);
        this.displayed = state.display;
        return true;
      }, this.delay);
    },
  },
  components: { Editor, GridSimulator, Console },
};
</script>

<style lang="scss" scoped>
// Using SCSS instead of SASS because it supports multi-line statements
// which makes CSS grid easier to visualize

#app {
  font-family: 'Roboto', sans-serif;
  height: 100%;
  overflow: hidden;
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
