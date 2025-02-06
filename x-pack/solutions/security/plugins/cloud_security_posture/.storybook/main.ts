/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultConfig, mergeWebpackFinal } from '@kbn/storybook';
import type { Configuration } from 'webpack';
import { resolve } from 'path';

const cspmWebpack: Configuration = {
  resolve: {
    alias: {
      '../../common/hooks/use_kibana': resolve(__dirname, './mocks.ts'),
      '../../common/hooks/use_is_subscription_status_valid': resolve(__dirname, './mocks.ts'),
      '../../../../../../../../hooks': resolve(__dirname, './mocks.ts'),
    },
  },
  module: {
    rules: [
      {
        test: /node_modules[\/\\]@?stream[\/\\].*.js$/,
        include: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
          },
        },
      },
    ],
  },
  node: {
    fs: 'empty',
    stream: false,
    os: false,
  },
};

module.exports = {
  ...defaultConfig,
  stories: ['../**/*.stories.+(tsx|mdx)'],
  reactOptions: {
    strictMode: true,
  },
  ...mergeWebpackFinal(cspmWebpack),
};
