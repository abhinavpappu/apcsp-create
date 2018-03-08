<template>
  <div id="app">
    <editor
      class="code-editor"
      :initial-text="rawCode"
      :highlighted="highlighted"
      :debugging-text="debuggingText"
      @input="text => rawCode = text"
      ref="editor"/>

    <controls
      class="controls"
      :playing="playing"
      @reset="reset"
      @play="paused ? play() : run()"
      @next="next"
      @previous="previous"
      @pause="paused = true"/>

    <grid-simulator
      class="grid-simulator"
      :delay="400"
      ref="grid-simulator"/>

    <console :items="displayed"/>

    <div class="a"/>
    <div class="b"/>
  </div>
</template>

<script>
import helper from './helper';
import safeEval from './eval';
import Editor from './editor/Editor.vue';
import Controls from './Controls.vue';
import GridSimulator from './display/GridSimulator.vue';
import Console from './display/Console.vue';

export default {
  data() {
    return {
      rawCode:
`REPEAT 3 TIMES {
  REPEAT UNTIL (NOT CAN_MOVE(forward)) {
    MOVE_FORWARD()
  }
  ROTATE_RIGHT()
}
`,
      states: [],
      currentState: 0,
      endMessage: '',
      highlighted: [],
      debuggingText: '',
      playing: false,
      paused: false, // only considered paused when user presses pause
      delay: 400,
      displayed: [],
    };
  },
  computed: {
    code() {
      // adding line numbers first since convert syntax will modify them
      return this.convertSyntax(this.addLineNumbers(this.rawCode));
    },
  },
  methods: {
    addLineNumbers(code) {
      const commands = ['DISPLAY', 'INPUT', 'RANDOM', 'INSERT', 'APPEND', 'REMOVE', 'LENGTH',
        'MOVE_FORWARD', 'ROTATE_RIGHT', 'ROTATE_LEFT', 'CAN_MOVE'];

      const modifications = [];
      for (let i = 0; i < code.length; i++) {
        const str = code.slice(i);
        commands.forEach(command => {
          if (str.match(new RegExp(`^${command}\\s*\\((.|\\s)*?\\)`, 'i'))) {
            const start = i;
            const leftParen = code.indexOf('(', start);

            if (leftParen > -1) {
              // find corresponding right parentheses
              const end = helper.findCorresponding(code, leftParen, '(', ')');
              if (end) {
                modifications.push({ start, end, leftParen });
                i = leftParen; // start next search from the left parentheses (could be commands within the parentheses)
              }
            }
          }
        });
      }

      let newCode = code;
      // reverse sort by end values so that each modification doesn't affect the next one (modifies index)
      modifications.sort(({ end: e1 }, { end: e2 }) => e2 - e1).forEach(modification => {
        const { start, end, leftParen } = modification;
        const before = newCode.slice(0, start);
        const command = newCode.slice(start, leftParen).toUpperCase(); // so that lower case commands work
        const parentheses = newCode.slice(leftParen, end);
        const after = newCode.slice(end);
        newCode = `${before}${command}${parentheses}(${start})(${end})${after}`;
      });

      return newCode;
    },
    convertSyntax(code) {
      // [regex, replacement, label?]
      // the replacements happen in order, so later replacements occur after the prior ones are applied
      // case insensitive
      /* eslint-disable no-useless-escape */
      const replacements = [
        [/<-/g, '='],
        [/←/g, '='],
        [/(;|^)\s*((var|let|const)\s+)?([a-z]\w*)\s*=\s*((.|\s)*?)(;|$)/gim, // m - ^ and $ match start/end of line
          '$1 var $4 = $5;\n'], // allow declaring variables without var/let/const
        [/\s+mod\s+/gi, ' % '],
        [/≠/g, '!=='],
        [/≥/g, '>='],
        [/≤/g, '<='],
        [/(\w+)\[([^,\[\]]+)\]/g, '$1[($2) - 1]'], // subtract one from array indexing (1-indexed)
        [/not\s+/gi, '!'],
        [/\s+and\s+/gi, ' && '],
        [/\s+or\s+/gi, ' || '],
        [/if\s*\(((.|\s)*?)\)\s*{/gi, 'if ($1) {', 'if'],
        [/}\s*else(\s*{|\s+if)/gi, '} else $1'],
        [/repeat([^\{}]+?)times\s*{/gi, 'for (let i = 1, $_num = $_number($1) || 0; i <= $_num; i++) {'],
        [/repeat\s+until\s*\(((.|\s)*?)\)\s*{/gi, 'while (!($1)) {'],
        [/for\s+each\s+([a-z]\w*)\s+in\s+(.+?)\s*{/gi,
          'for (var i = 0, $1 = $2[0]; i < $2.length; $1 = $2[++i]) {'],
        [/procedure\s+(\w*)\s*\(((.|\s)*?)\)\s*{/gi, 'function $1($2) {'],
        [/while\s*\(((.|\s)*?)\)\s*{/gi, 'while ($_globals.continue && ($1)) {', 'while'], // prevent infinite loops
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

      const getReplacement = label => {
        let result = false;
        replacements.forEach(replacement => {
          if (replacement[2] === label) {
            result = replacement;
          }
        });
        return result;
      };

      // replace the '=' inside if and while statements with '==='
      ['if', 'while'].map(getReplacement).forEach(([regex]) => {
        helper.findAllIndexesOf(newCode, regex).forEach(index => {
          const start = newCode.indexOf('(', index);
          const end = helper.findCorresponding(newCode, start, '(', ')');
          const sub = newCode.slice(start + 1, end).replace(/([^=])=([^=])/, '$1===$2');
          newCode = `${newCode.slice(0, start + 1)}${sub}${newCode.slice(end)}`;
        });
      });

      return newCode;
    },
    reset() {
      this.currentState = 0;
      this.$refs['grid-simulator'].resetToDefault();
      this.highlighted = [];
      this.playing = false;
      this.paused = false;
    },
    run() {
      const $grid = this.$refs['grid-simulator'];
      const $editor = this.$refs.editor;
      this.reset();
      this.states = [];
      this.endMessage = '';

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

      const INPUT = () => start => end => {
        const { line } = $editor.cursorToPosition(start);
        const text = prompt(`Enter value for INPUT on line ${line + 1}:`); // eslint-disable-line no-alert
        saveState(start, end, text);
        return text;
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

      const MOVE_FORWARD = (numTimes = 1) => start => end => {
        position = $grid.applyMovement(position, orientation, numTimes);
        saveState(start, end, String(numTimes));
      };

      const ROTATE_RIGHT = (numTimes = 1) => start => end => {
        orientation = $grid.applyTurn(orientation, 1, numTimes);
        saveState(start, end, String(numTimes));
      };

      const ROTATE_LEFT = (numTimes = 1) => start => end => {
        orientation = $grid.applyTurn(orientation, -1, numTimes);
        saveState(start, end, String(numTimes));
      };

      const CAN_MOVE = direction => start => end => {
        const newOrientation = $grid.applyTurn(orientation, direction);
        const newPosition = $grid.applyMovement(position, newOrientation);
        const isValid = $grid.isValid(newPosition);
        saveState(start, end, String(isValid));
        return isValid;
      };

      const identity = value => start => end => {
        saveState(start, end, String(value));
        return value;
      };

      try {
        safeEval(this.code, {
          $_number: Number, // using it to parse input() when it should be a number
          forward: 0,
          right: 1,
          left: -1,
          backward: 2,
          $_globals: globals,
          $_identity: identity,
          DISPLAY,
          INPUT,
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

        this.play();
      } catch (e) {
        this.displayed.push({
          text: `${e.name}: ${e.message}`,
          style: { color: 'red', fontSize: '1em' },
        });
      }
    },
    showState(i) {
      if (this.states.length === 0) {
        this.displayed.push({
          text: 'Run the program first (▶).',
          style: { fontSize: '1.2em', color: 'black' },
        });
      } else {
        const $grid = this.$refs['grid-simulator'];
        this.currentState = Math.min(Math.max(0, i), this.states.length - 1);
        const state = this.states[this.currentState];
        $grid.setPosition(state.position);
        $grid.setOrientation(state.orientation);
        this.highlighted = [state.start, state.end];
        this.debuggingText = state.text;
        this.displayed = state.display;
        if (i === this.states.length - 1) {
          this.paused = false;
          if (this.endMessage) {
            this.displayed.push(this.endMessage);
          } else if ($grid.isGoal(state.position)) {
            this.displayed.push({
              text: 'SUCCESS',
              style: { color: 'green', fontSize: '3em' },
            });
          }
        }
      }
    },
    next() {
      this.playing = false;
      this.showState(this.currentState + 1);
    },
    previous() {
      this.playing = false;
      this.showState(this.currentState - 1);
    },
    pause() {
      this.paused = true;
    },
    play(start = this.currentState) {
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

      this.playing = true;
      delayedFor(start, this.states.length, 1, i => {
        if (!this.playing) return false; // ends loop
        this.showState(i);
        return true;
      }, this.delay, () => {
        this.highlighted = [];
        this.playing = false;
      });
    },
  },
  watch: {
    rawCode() {
      this.reset();
    },
    // possible configurations:
    // paused, not playing
    // not paused, playing
    // not paused, not playing
    paused() {
      if (this.paused) {
        this.playing = false;
      }
    },
    playing() {
      if (this.playing) {
        this.paused = false;
      }
    },
  },
  components: {
    Editor,
    Controls,
    GridSimulator,
    Console,
  },
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
    "  .     .      .     .       .  " 10px
    "  .   editor   a   grid-sim  .  " 6fr
    "  .   editor   a   console   .  " 3fr
    "  .   controls .   console   .  " 1fr
    "  .     b      .     .       .  " 10px
    / 10px  1fr    20px   1fr    10px;

  .code-editor {
    grid-area: editor;
  }

  .grid-simulator {
    grid-area: grid-sim;
  }

  .controls {
    grid-area: controls;
    z-index: 2;
  }

  .console {
    grid-area: console;
  }

  .a {
    grid-area: a;
  }

  .b {
    grid-area: b;
  }

  .a, .b { // blank fillers to overlap the editor's cursor if it goes out of bounds
    background: white;
    z-index: 1;
  }
}

</style>
