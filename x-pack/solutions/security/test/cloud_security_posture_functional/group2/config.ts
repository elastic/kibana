/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../config.base.ts'));

  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('.')],
    security: {
      ...baseConfig.get('security'),
      cookieLogin: false, // tests rely on localStorage column state between steps; loginByCookie clears it
    },
    junit: {
      reportName: 'X-Pack Cloud Security Posture Functional Tests - Group 2 (Findings)',
    },
  };
}
