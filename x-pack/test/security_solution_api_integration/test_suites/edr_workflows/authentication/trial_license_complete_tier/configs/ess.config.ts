/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { FtrConfigProviderContext } from '@kbn/test';
// import { generateConfig } from '../../../../../edr_workflows/configs/config.base';
// import { services } from '../../../../../edr_workflows/services';
//
// export default async function ({ readConfigFile }: FtrConfigProviderContext) {
//   const xPackAPITestsConfig = await readConfigFile(
//     require.resolve('../../../../../../api_integration/config.ts')
//   );
//
//   return generateConfig({
//     baseConfig: xPackAPITestsConfig,
//     junitReportName: 'EDR Workflows - Authentication Integration Tests - ESS Env - Trial License',
//     target: 'ess',
//     services,
//     testFiles: [require.resolve('..')],
//   });
// }

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.edr_workflows.trial')
  );

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'EDR Workflows - Authentication Integration Tests - ESS Env - Trial License',
    },
  };
}
