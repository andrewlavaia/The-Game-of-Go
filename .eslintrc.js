module.exports = {
  "parserOptions": {
    "ecmaVersion": "6",
    "sourceType": "module"
  },
  "env": {
    "node": true,
    "es6": true
  },
  "extends": "airbnb-base",
  // "extends": "eslint:recommended",
  "rules": {
    "camelcase": 0, // preference to allow underscores in variable names
    "no-console": 0,  // turn off errors for using console.log() while app still in development
    "no-param-reassign": 1, // change to warning only as this is commonly done in express + node.js
    "no-plusplus": 0, // preference towards i++ rather than i += 1
    "no-shadow": 1, // change to warning only as this can be useful
    "no-unused-vars": ["error", { "args": "none" }], // turns off unused var error for unused arguments in functions
    "prefer-destructuring": 0, // preference to access array and object properties directly (ie person.name.first)
    "prefer-template": 0, // preference towards "Hello, " + name + "!"; over `Hello, ${name}!`;
  }
};
