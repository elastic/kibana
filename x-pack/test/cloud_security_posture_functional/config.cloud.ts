/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );
  // FTR configuration for cloud testing
  return {
    ...xpackFunctionalConfig.getAll(),
    pageObjects,
    testFiles: [resolve(__dirname, './cloud_tests')],
    junit: {
      reportName: 'X-Pack Cloud Security Posture Sanity Tests',
    },
  };
}
