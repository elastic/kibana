/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { FtrConfigProviderContext } from '@kbn/test';

export type { SecurityTelemetryFtrProviderContext } from '../group1/config';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../group1/config.ts'));
  return {
    ...baseConfig.getAll(),
    testFiles: [resolve(__dirname, './pages')],
    junit: {
      reportName: 'X-Pack Cloud Security Posture Functional Tests - Group 3',
    },
  };
}
