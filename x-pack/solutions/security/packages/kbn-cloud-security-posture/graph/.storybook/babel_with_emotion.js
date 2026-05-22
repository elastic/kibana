/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// CJS module on purpose. Jest loads the transformer with `require`, and the
// inner `require.resolve('@kbn/babel-preset/node_preset')` only resolves in
// CJS scope. The previous `.ts` version mixed `import` with `require.resolve`
// and crashed Jest's transform pipeline with "require is not defined in ES
// module scope" whenever 2+ test files needed the transformer in the same run.

const babelJest = require('babel-jest').default;

module.exports = babelJest.createTransformer({
  presets: [
    [
      require.resolve('@kbn/babel-preset/node_preset'),
      {
        '@babel/preset-env': {
          // disable built-in filtering, which is more performant but strips the import of `regenerator-runtime` required by EUI
          useBuiltIns: false,
          corejs: false,
        },
      },
    ],
  ],
  plugins: ['@emotion'],
});
