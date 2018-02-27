<template>
  <div id="app">
    <editor class="code-editor" :initial-text="code" @input="text => code = text"/>
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
      code: 'IF(CAN_MOVE(forward)) {\n  MOVE_FORWARD()\n}',
      states: [],
      currentState: 0,
      paused: false,
      delay: 400,
    };
  },
  methods: {
    addLineNumbers(code) {
      const lines = code.split('\n');
      const commands = ['MOVE_FORWARD', 'ROTATE_RIGHT', 'ROTATE_LEFT', 'CAN_MOVE'];
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
    run() {
      const $grid = this.$refs['grid-simulator'];
      this.states = [];

      let { position, orientation } = $grid.arrow;
      const stop = [false];

      const saveState = (line = 0, column = 0, length = 0) => {
        if (!stop[0]) {
          this.states.push({
            position: position.slice(0),
            orientation,
            line,
            column,
            length,
          });
          if (!$grid.isValid(position)) {
            stop[0] = true;
          }
        }
      };
      saveState();

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

      let { code } = this;
      code = this.addLineNumbers(code);

      safeEval(code, {
        forward: 0,
        right: 1,
        left: -1,
        backward: 2,
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
