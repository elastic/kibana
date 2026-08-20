/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeRsbuildConfig } from '@rsbuild/core';
import type { StorybookConfig } from '@kbn/storybook';
// eslint-disable-next-line import/no-nodejs-modules
import { resolve } from 'path';
import { defaultConfig } from '@kbn/storybook';

const graphRsbuild = {
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

const sbConfig: StorybookConfig = {
  ...defaultConfig,
  async rsbuildFinal(config, options) {
    return mergeRsbuildConfig(
      (await defaultConfig.rsbuildFinal?.(config, options)) ?? config,
      graphRsbuild
    );
  },
};

// eslint-disable-next-line import/no-default-export
export default sbConfig;
