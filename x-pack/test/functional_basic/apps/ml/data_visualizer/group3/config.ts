/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../../config.base.ts'));

  return {
    // default to the  ml/config.base.ts
    ...baseConfig.getAll(),
    testFiles: [require.resolve('.')],
    junit: {
      ...baseConfig.get('junit'),
      reportName: 'Chrome X-Pack UI Functional Tests Basic License - ml - data visualizer - group3',
    },
  };
}
