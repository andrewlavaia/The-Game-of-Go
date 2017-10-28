module.exports = {
  "parserOptions": {
    "ecmaVersion": "5",
    "sourceType": "script",
  },
  "env": {
    "node": true,
    "es6": false,
    "jquery": true,
    "browser": true,
  },
  "extends": "airbnb-base",
  // "extends": "eslint:recommended",
  "rules": {
    "camelcase": 0, // preference to allow underscores in variable names
    "func-names": 0, // allow anonymous functions
    "no-console": 0,  // turn off errors for using console.log() while app still in development
    "no-param-reassign": 1, // change to warning only as this is commonly done in express + node.js
    "no-var": 0, // let and const not supported in ECMA5
    "no-plusplus": 0, // preference towards i++ rather than i += 1
    "no-shadow": 1, // change to warning only as this can be useful
    "no-unused-vars": ["error", { "args": "none" }], // turns off unused var error for unused arguments in functions
    "object-shorthand": 0, // not supported in ECMA 5
    "prefer-arrow-callback": 0, // ie11 cannot understand arrow callback functions! Avoid in public_html folder
    "prefer-destructuring": 0, // preference to access array and object properties directly (ie person.name.first)
    "prefer-template": 0, // preference towards "Hello, " + name + "!"; over `Hello, ${name}!`;
    "wrap-iife": [2, "inside"], // preference for self invoking functions in the form of (function (){})();
  }
};
