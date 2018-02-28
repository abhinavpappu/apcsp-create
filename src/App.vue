<template>
  <div id="app">
    <editor class="code-editor" :initial-text="rawCode" @input="text => rawCode = text"/>
    <grid-simulator class="grid-simulator" :delay="400" ref="grid-simulator"/>
    <div class="console">b</div>
  </div>
</template>

<script>
import safeEval from './eval';
import Editor from './editor/Editor.vue';
import GridSimulator from './grid/GridSimulator.vue';

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
    };
  },
  computed: {
    code() {
      return this.addLineNumbers(this.convertSyntax(this.rawCode));
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
      const replacements = {
        '<-': '=',
        '←': '=',
        ' mod ': ' % ',
        '≠': '!=',
        '≥': '>=',
        '≤': '<=',
        'not ': '!',
        ' and ': ' && ',
        ' or ': ' || ',
        'if\\s*\\(((.|\\s)*?)\\)\\s*{': 'if ($1) {',
        '}\\s*else\\s*{': '} else {',
        'while\\s*\\(((.|\\s)*?)\\)\\s*{': 'while ($_globals.continue && ($1)) {',
        'repeat\\s+(\\d)\\s+times\\s*{': 'for (var i = 0; i < $1 && $_globals.continue; i++) {',
        'repeat\\s+until\\s*\\(((.|\\s)*?)\\)\\s*{': 'while ($_globals.continue && !($1))',
        'for\\s+each\\s+([a-z]\\w*)\\s+in\\s+([a-z]\\w*)\\s*{':
          'for (var i = 0, $1 = $2[0]; i < $2.length; $1 = $2[++i])',
        'procedure\\s+(\\w*)\\s*\\(((.|\\s)*?)\\)\\s*{': 'function $1($2) {',
        '(\\s+)return ': '$1return ', // to uncapitalize it
      };
      let newCode = code;
      Object.keys(replacements).forEach(key => {
        newCode = newCode.replace(new RegExp(key, 'gi'), replacements[key]);
      });
      return newCode;
    },
    run() {
      const $grid = this.$refs['grid-simulator'];
      $grid.resetToDefault();
      this.states = [];

      let { position, orientation } = $grid.arrow;
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
          });
          if (!$grid.isValid(position)) {
            globals.continue = false;
          }
        }
      };
      saveState();

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
        saveState(line, column, length, list.length);
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
        saveState(line, column, length);
        return $grid.isValid(newPosition);
      };

      safeEval(this.code, {
        forward: 0,
        right: 1,
        left: -1,
        backward: 2,
        $_globals: globals,
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
      delayedFor(start, this.states.length, 1, i => {
        if (this.paused) return false; // ends loop
        const state = this.states[i];
        $grid.setPosition(state.position);
        $grid.setOrientation(state.orientation);
        return true;
      }, this.delay);
    },
  },
  components: { Editor, GridSimulator },
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
