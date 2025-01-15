/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const transformConfig = await readConfigFile(require.resolve('../config.base.ts'));

  return {
    // default to the  transform/config.base.ts
    ...transformConfig.getAll(),
    testFiles: [require.resolve('.')],
    junit: {
      ...transformConfig.get('junit'),
      reportName: 'Chrome X-Pack UI Functional Tests Basic License - transform - feature controls',
    },
  };
}
