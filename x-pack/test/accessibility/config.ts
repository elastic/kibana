/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';
import { pageObjects } from './page_objects';

export default async function({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('./apps/login_page')],
    pageObjects,
    services,

    junit: {
      reportName: 'X-Pack Accessibility Tests',
    },
  };
}
