/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const searchFuncationalConfig = await readConfigFile(require.resolve('../config'));

  return {
    ...searchFuncationalConfig.getAll(),
    junit: {
      reportName: 'Search Solution Functional Tests - Apps - Search Playground',
    },
    // load tests in the index file
    testFiles: [require.resolve('../apps/search_playground/index.ts')],
  };
}
