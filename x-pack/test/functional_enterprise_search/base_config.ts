/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  return {
    // common test config
    ...kibanaCommonTestsConfig.getAll(),

    // default to the xpack functional config
    ...xPackFunctionalConfig.getAll(),
    services,
    pageObjects,
  };
}
