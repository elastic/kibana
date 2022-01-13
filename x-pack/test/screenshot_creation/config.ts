/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('../functional/config.js'));

  return {
    // default to the xpack functional config
    ...xpackFunctionalConfig.getAll(),
    services,
    testFiles: [require.resolve('./apps')],
    junit: {
      ...xpackFunctionalConfig.get('junit'),
      reportName: 'Chrome X-Pack UI Screenshot Creation',
    },
  };
}
