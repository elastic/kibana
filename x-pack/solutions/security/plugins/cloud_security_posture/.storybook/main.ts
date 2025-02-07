/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { defaultConfig, mergeWebpackFinal } from '@kbn/storybook';
// import type { Configuration } from 'webpack';
// import { resolve } from 'path';

import { defaultConfig, StorybookConfig } from '@kbn/storybook';
import def from 'ajv/dist/vocabularies/discriminator';

const cspmStorybookConfig: StorybookConfig = {
  ...defaultConfig,
  stories: ['../public/**/*.stories.tsx'],
  addons: [...(defaultConfig.addons || []), '@storybook/addon-interactions'],
  features: {
    ...defaultConfig.features,
    interactionsDebugger: true,
  },
};

module.exports = cspmStorybookConfig;
