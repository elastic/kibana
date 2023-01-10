/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';
import { FtrConfigProviderContext } from '@kbn/test';
import { runEnterpriseSearchTests } from './runner';
// import { getLatestVersion } from './artifact_manager';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const baseConfig = await readConfigFile(require.resolve('./cypress.config'));

  return {
    ...kibanaCommonTestsConfig.getAll(),
    // default to the xpack functional config
    ...baseConfig.getAll(),

    junit: {
      reportName: 'X-Pack Enterprise Search Functional Tests with Host Configured',
    },
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--enterpriseSearch.host=http://localhost:3002',
      ],
    },
    testRunner: (context: GenericFtrProviderContext<{}, {}>) => {
      return runEnterpriseSearchTests(context, 'open');
    },
  };
}
