/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { services } from './services';
import { pageObjects } from './page_objects';

export default async function({ readConfigFile }) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    ...functionalConfig.getAll(),

    testFiles: [
      require.resolve('./tests/canvas'),
      require.resolve('./tests/login_page'),
      require.resolve('./tests/maps'),
      require.resolve('./tests/infra'),
    ],

    services,
    pageObjects,

    junit: {
      reportName: 'X-Pack Visual Regression Tests',
    },
  };
}
