/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultConfig, mergeWebpackFinal } from '@kbn/storybook';
import type { Configuration } from 'webpack';
// eslint-disable-next-line import/no-nodejs-modules
import { resolve } from 'path';

const graphWebpack: Configuration = {
  resolve: {
    alias: {
      '../../hooks/use_fetch_graph_data': resolve(
        __dirname,
        '../src/components/mock/use_fetch_graph_data.mock.ts'
      ),
    },
    fallback: {
      fs: false,
      stream: false,
      os: false,
    },
  },
};

module.exports = {
  ...defaultConfig,
  stories: ['../**/*.stories.+(tsx|mdx)'],
  reactOptions: {
    strictMode: true,
  },
  ...mergeWebpackFinal(graphWebpack),
};
