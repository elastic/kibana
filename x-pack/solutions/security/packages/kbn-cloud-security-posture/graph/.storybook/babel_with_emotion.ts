/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import babelJest from 'babel-jest';

// eslint-disable-next-line import/no-default-export
export default babelJest.createTransformer({
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
