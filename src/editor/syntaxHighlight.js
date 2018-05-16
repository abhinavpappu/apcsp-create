import helper from '../helper';

export default code => {
  const highlights = {};
  const addColor = (color, ranges) => {
    highlights[color] = highlights[color] ? highlights[color].concat(ranges) : ranges;
  };

  const commands = ['DISPLAY', 'INPUT', 'RANDOM', 'INSERT', 'APPEND', 'REMOVE', 'LENGTH',
    'MOVE_FORWARD', 'ROTATE_RIGHT', 'ROTATE_LEFT', 'CAN_MOVE'];
  const reserved = ['forward', 'right', 'left', 'backward', 'true', 'false'];
  const operators = ['+', '-', '*', '/', 'MOD', '%', '<-', '=', '≠', '>', '<', '≥', '≤',
    'NOT', '!', 'AND', 'OR'];

  const colors = {
    // [regex, start offset]
    mediumblue: [
      [/if\s*(?=\()/gi, 0],
      [/}\s*else\s*/gi, 1],
      [/repeat\s+(?!=until)/gi, 0],
      [/\stimes\s*(?={)/gi, 1],
      [/repeat\s+until\s*(?=\()/gi, 0],
      [/for\s+each\s+/gi, 0],
      [/\sin\s+/gi, 1],
      [/procedure\s+/gi, 0],
      [/while\s*(?=\()/gi, 0],
      [/(\s|;)return/gi, 1],
    ],
    darkorchid: commands.map(command => [new RegExp(`${command}\\s*(?=\\()`, 'gi'), 0]),
    coral: reserved.map(val => [new RegExp(`\\W${val}(?!\\w)`, 'g'), 1]),
    crimson: operators.map(operator => [new RegExp(`\\W\\${operator}\\s+`, 'gi'), 1]),
  };

  Object.keys(colors).forEach(color => {
    colors[color].forEach(statement => {
      const matches = code.match(statement[0]);
      const indexes = helper.findAllIndexesOf(code, statement[0]);
      const ranges = indexes.map((index, i) => [index + statement[1], index + matches[i].length]);
      for (let i = ranges.length - 1; i >= 0; i--) {
        if (helper.isWithin(code, ranges[i][0], "'", "'")) {
          ranges.splice(i, 1);
        }
      }
      addColor(color, ranges);
    });
  });

  const strings = helper.findAllRanges(code, '"', '"').concat(helper.findAllRanges(code, "'", "'"));
  addColor('forestgreen', strings);

  return highlights;
};
