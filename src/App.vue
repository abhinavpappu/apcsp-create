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
      endMessage: '',
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
      // let lines = code.split('\n');
      const commands = ['DISPLAY', 'INPUT', 'RANDOM', 'INSERT', 'APPEND', 'REMOVE', 'LENGTH',
        'MOVE_FORWARD', 'ROTATE_RIGHT', 'ROTATE_LEFT', 'CAN_MOVE'];

      const modifications = [];
      for (let i = 0; i < code.length; i++) {
        commands.forEach(command => {
          if (code.slice(i).match(new RegExp(`^${command}\\s*\\((.|\\s)*?\\)`))) {
            const start = i;
            const leftParen = code.indexOf('(', start);

            // find corresponding right parentheses
            const count = { '(': 1, ')': 0 };
            let end = false;
            for (let j = leftParen + 1; j < code.length && !Number.isInteger(end); j++) {
              if (count[code[j]] !== undefined) count[code[j]]++;
              if (count['('] === count[')']) {
                end = j + 1;
              }
            }

            modifications.push({ start, end });
            i = leftParen; // start next search from the left parentheses (could be commands within the parentheses)
          }
        });
      }

      let newCode = code;
      // reverse sort by end values so that each modification doesn't affect the next one (modifies index)
      modifications.sort(({ end: e1 }, { end: e2 }) => e2 - e1).forEach(modification => {
        const { start, end } = modification;
        newCode = `${newCode.slice(0, end)}(${start})(${end})${newCode.slice(end)}`;
      });

      return newCode;
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
        [/repeat\s+(\w+)\s+times\s*{/gi, 'for (let i = 1; i <= $1; i++) {'],
        [/repeat\s+until\s*\(((.|\s)*?)\)\s*{/gi, 'while (!($1))'],
        [/for\s+each\s+([a-z]\w*)\s+in\s+(.+?)\s*{/gi,
          'for (var i = 0, $1 = $2[0]; i < $2.length; $1 = $2[++i]) {'],
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
      this.currentState = 0;

      let { position, orientation } = $grid.arrow;
      let display = [];
      const globals = {
        continue: true,
      };

      const saveState = (start = 0, end = 0, text = '') => {
        if (globals.continue) {
          this.states.push({
            position: position.slice(0),
            orientation,
            start,
            end,
            text,
            display,
          });
          if (!$grid.isValid(position)) {
            globals.continue = false;
            this.endMessage = {
              text: 'CRASH!',
              style: { fontSize: '3em', color: 'red' },
            };
          } else if (this.states.length > 1000) {
            globals.continue = false;
            this.endMessage = {
              text: 'Error. Check for infinite loops',
              style: { fontSize: '2em', color: 'red' },
            };
          }
        }
      };
      saveState();

      const DISPLAY = text => start => end => {
        const displayText = String(text);
        display = display.concat(displayText);
        saveState(start, end, displayText);
      };

      const RANDOM = (a, b) => start => end => {
        const random = Math.floor((Math.random() * ((b - a) + 1)) + a);
        saveState(start, end, String(random));
        return random;
      };

      const INSERT = (list, i, value) => start => end => {
        list.splice(i, 0, value);
        saveState(start, end, `[${list}]`);
      };

      const APPEND = (list, value) => start => end => {
        list.push(value);
        saveState(start, end, `[${list}]`);
      };

      const REMOVE = (list, i) => start => end => {
        list.splice(i, 1);
        saveState(start, end, `[${list}]`);
      };

      const LENGTH = list => start => end => {
        saveState(start, end, String(list.length));
        return list.length;
      };

      const MOVE_FORWARD = () => start => end => {
        position = $grid.applyMovement(position, orientation);
        saveState(start, end);
      };

      const ROTATE_RIGHT = () => start => end => {
        orientation = $grid.applyTurn(orientation, 1);
        saveState(start, end);
      };

      const ROTATE_LEFT = () => start => end => {
        orientation = $grid.applyTurn(orientation, -1);
        saveState(start, end);
      };

      const CAN_MOVE = direction => start => end => {
        const newOrientation = $grid.applyTurn(orientation, direction);
        const newPosition = $grid.applyMovement(position, newOrientation);
        const isValid = $grid.isValid(newPosition);
        saveState(start, end, String(isValid));
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
    showState(i) {
      const { 'grid-simulator': $grid, editor: $editor } = this.$refs;
      this.currentState = Math.min(Math.max(0, i), this.states.length);
      const state = this.states[i];
      $grid.setPosition(state.position);
      $grid.setOrientation(state.orientation);
      $editor.select(state.start, state.end);
      this.displayed = state.display;
      if (i === this.states.length - 1 && this.endMessage) {
        this.displayed.push(this.endMessage);
      }
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

      delayedFor(start, this.states.length, 1, i => {
        if (this.paused) return false; // ends loop
        this.showState(i);
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
