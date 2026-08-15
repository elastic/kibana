/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Build scripts run with `node`, so allow Node.js builtins and `process.exit`
// — the same exemption the root `scripts/**/*.js` override grants. This block
// is scoped to `scripts/**/*.js` only so runtime code remains unaffected.
module.exports = {
  overrides: [
    {
      files: ['scripts/**/*.js'],
      rules: {
        'import/no-nodejs-modules': 'off',
        'no-process-exit': 'off',
      },
    },
  ],
};
