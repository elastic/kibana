/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { services, pageObjects } from './ftr_provider_context';

export async function withLocale({ readConfigFile }: FtrConfigProviderContext, locale: string) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('./tests')],
    services,
    pageObjects,
    junit: {
      reportName: `Localization (${locale}) Integration Tests`,
    },
    screenshots: {
      directory: resolve(__dirname, 'screenshots'),
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [...functionalConfig.get('kbnTestServer.serverArgs'), `--i18n.locale=${locale}`],
    },
  };
}
