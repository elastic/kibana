/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { CA_CERT_PATH } from '@kbn/dev-utils';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const xpackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.js')
  );

  return {
    ...kibanaCommonTestsConfig.getAll(),

    esTestCluster: {
      ...xpackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('esTestCluster.serverArgs'),
        // define custom es server here
        // API Keys is enabled at the top level
        'xpack.security.enabled=true',
      ],
    },

    kbnTestServer: {
      ...xpackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--csp.strict=false',
        // define custom kibana server args here
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        // retrieve rules from the filesystem but not from fleet for Cypress tests
        '--xpack.securitySolution.prebuiltRulesFromFileSystem=true',
        '--xpack.securitySolution.prebuiltRulesFromSavedObjects=false',
        '--xpack.ruleRegistry.write.enabled=true',
        '--xpack.ruleRegistry.write.cache.enabled=false',
        '--xpack.ruleRegistry.unsafe.indexUpgrade.enabled=true',
        '--xpack.ruleRegistry.unsafe.legacyMultiTenancy.enabled=true',
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([
          'riskyHostsEnabled',
          'ruleRegistryEnabled',
        ])}`,
        `--home.disableWelcomeScreen=true`,
      ],
    },
  };
}
