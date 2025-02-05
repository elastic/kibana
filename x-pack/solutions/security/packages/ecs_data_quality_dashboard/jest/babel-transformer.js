/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
const babelJest = require('babel-jest');

// eslint-disable-next-line import/no-extraneous-dependencies
const rootTransformerConfig = require('@kbn/test/src/jest/transforms/babel/transformer_config');

module.exports = babelJest.default.createTransformer({
  ...rootTransformerConfig,
  presets: [
    ...rootTransformerConfig.presets,
    [
      require.resolve('@emotion/babel-preset-css-prop'),
      {
        labelFormat: '[filename]--[local]',
      },
    ],
  ],
});
