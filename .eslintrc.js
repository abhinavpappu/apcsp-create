module.exports = {
  "extends": ["airbnb-base", "plugin:vue/strongly-recommended"],
  "parser": "vue-eslint-parser",
  "parserOptions": {
      "parser": "babel-eslint",
      "sourceType": "module",
      "ecmaVersion": 2017
  },
  "rules": {
      "linebreak-style": ["error", "windows"],
      "max-len": ["error", {
          "ignoreComments": true,
          "code": 120,
          "ignorePattern": "^\\s*box-shadow"
      }],
      "arrow-parens": ["error", "as-needed"],
      "no-multi-assign": "off",
      "no-new": "off",
      "no-plusplus": "off",
      "vue/max-attributes-per-line": ["error", {"singleline": 4}],
      "no-bitwise": "off",
      "vue/require-v-for-key": "off",
      "no-param-reassign": "off",
      "no-nested-ternary": "off",
  }
};