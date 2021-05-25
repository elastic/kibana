/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('./base_config'));

  return {
    // default to the xpack functional config
    ...baseConfig.getAll(),

    testFiles: [resolve(__dirname, './apps/enterprise_search/without_host_configured')],

    junit: {
      reportName: 'X-Pack Enterprise Search Functional Tests without Host Configured',
    },
  };
}
