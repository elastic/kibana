/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

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
