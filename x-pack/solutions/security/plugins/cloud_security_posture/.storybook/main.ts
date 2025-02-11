/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { defaultConfig, mergeWebpackFinal } from '@kbn/storybook';

const aliases = {
  resolve: {
    alias: {
      // Mocking use_fleet_status.tsx
      '../../../../../../../../hooks': resolve(__dirname, './mocks.ts'),
    },
  },
};

module.exports = {
  ...defaultConfig,
  stories: ['../public/**/*.stories.tsx'],
  addons: [...(defaultConfig.addons || []), '@storybook/addon-interactions'],
  features: {
    ...defaultConfig.features,
    interactionsDebugger: true,
  },
  ...mergeWebpackFinal(aliases),
};
