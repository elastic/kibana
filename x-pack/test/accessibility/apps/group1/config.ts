/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { services } from '../../services';
import { pageObjects } from '../../page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../functional/config.base.js')
  );

  return {
    ...functionalConfig.getAll(),

    testFiles: [require.resolve('.')],

    pageObjects,
    services,

    junit: {
      reportName: 'X-Pack Accessibility Tests - Group 1',
    },
  };
}
