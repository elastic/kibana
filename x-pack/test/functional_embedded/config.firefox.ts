/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const chromeConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...chromeConfig.getAll(),

    browser: {
      type: 'firefox',
      acceptInsecureCerts: true,
    },

    suiteTags: {
      exclude: ['skipFirefox'],
    },

    junit: {
      reportName: 'Firefox Kibana Embedded in iframe with X-Pack Security',
    },
  };
}
