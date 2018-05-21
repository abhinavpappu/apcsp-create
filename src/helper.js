const helper = {
  indexOf(str, regex, start = 0) {
    const index = str.slice(start).search(regex);
    return index > -1 ? start + index : -1;
  },
  findAllIndexesOf(str, regex) {
    const results = [];
    let start = 0;
    let index = str.search(regex);
    while (index > -1) {
      results.push(index);
      start = index + 1;
      index = helper.indexOf(str, regex, start);
    }
    return results;
  },
  findCorresponding(str, left, char1, char2) { // char1 must be different from char2
    const count = { [char1]: 1, [char2]: 0 };
    let right = false;
    for (let i = left + 1; i < str.length && !Number.isInteger(right); i++) {
      if (count[str[i]] !== undefined) count[str[i]]++;
      if (count[char1] === count[char2]) {
        right = i + 1; // the character after corresponding char2 (so that str.slice(left, right) includes both characters)
      }
    }
    return right;
  },
  findAllRanges(str, char1, char2) { // char1 can be the same as char2
    let indexes = helper.findAllIndexesOf(str, `\\${char1}`);
    if (char1 === char2) {
      const ranges = [];
      if (indexes.length % 2 !== 0) indexes = indexes.slice(0, -1);
      for (let i = 0; i < indexes.length; i += 2) {
        ranges.push(indexes.slice(i, i + 2));
      }
      return ranges;
    }
    return indexes.map(index => [index, helper.findCorresponding(str, index, char1, char2)]);
  },
  isInRange(value, min, max) { // inclusive min, exclusive max
    return value >= min && value < max;
  },
  isWithin(str, index, char1, char2) {
    const ranges = helper.findAllRanges(str, char1, char2);
    let isWithin = false;
    ranges.forEach(range => {
      if (helper.isInRange(index, range[0] + 1, range[1])) {
        isWithin = true;
      }
    });
    return isWithin;
  },
};

export default helper;
