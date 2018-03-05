import helper from '../helper';

export default code => {
  const highlights = {};
  const addColor = (color, ranges) => {
    highlights[color] = highlights[color] ? highlights[color].concat(ranges) : ranges;
  };

  const commands = ['DISPLAY', 'INPUT', 'RANDOM', 'INSERT', 'APPEND', 'REMOVE', 'LENGTH',
    'MOVE_FORWARD', 'ROTATE_RIGHT', 'ROTATE_LEFT', 'CAN_MOVE'];
  const reserved = ['forward', 'right', 'left', 'backward'];
  const operators = ['+', '-', '*', '/', 'MOD', '%', '=', '≠', '>', '<', '≥', '≤', 'NOT', '!'];

  const colors = {
    mediumblue: [
      /if\s*(?=\()/gi,
      /else\s*/gi,
      /repeat\s+(?!=until)/gi,
      /\stimes\s*(?={)/gi,
      /repeat\s+until\s*(?=\()/gi,
      /for\s+each\s+/gi,
      /\sin\s+/gi,
    ],
    darkorchid: commands.map(command => new RegExp(`${command}\\s*(?=\\()`, 'gi')),
    coral: reserved.map(val => new RegExp(`${val}`, 'g')),
    crimson: operators.map(operator => new RegExp(`\\${operator}\\s+`, 'gi')),
  };

  Object.keys(colors).forEach(color => {
    colors[color].forEach(statement => {
      const matches = code.match(statement);
      const indexes = helper.findAllIndexesOf(code, statement);
      const ranges = indexes.map((index, i) => [index, index + matches[i].length]);
      addColor(color, ranges);
    });
  });

  const strings = helper.findAllRanges(code, '"', '"').concat(helper.findAllRanges(code, "'", "'"));
  addColor('forestgreen', strings);

  return highlights;
};
