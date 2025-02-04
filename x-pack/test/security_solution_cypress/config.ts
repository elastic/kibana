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
    require.resolve('@kbn/test-suites-src/common/config')
  );
  const xpackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
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
        '--usageCollection.uiCounters.enabled=false',
        // define custom kibana server args here
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        '--xpack.ruleRegistry.write.enabled=true',
        '--xpack.ruleRegistry.write.cache.enabled=false',
        '--xpack.ruleRegistry.unsafe.indexUpgrade.enabled=true',
        // Without below line, default interval for rules is 1m
        // See https://github.com/elastic/kibana/pull/125396 for details
        '--xpack.alerting.rules.minimumScheduleInterval.value=1s',
        '--xpack.ruleRegistry.unsafe.legacyMultiTenancy.enabled=true',
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([
          'alertSuppressionForSequenceEqlRuleEnabled',
          'assetInventoryUXEnabled',
        ])}`,
        // mock cloud to enable the guided onboarding tour in e2e tests
        '--xpack.cloud.id=test',
        `--home.disableWelcomeScreen=true`,
        // Specify which version of the detection-rules package to install
        // `--xpack.securitySolution.prebuiltRulesPackageVersion=8.3.1`,
        // Set an inexistent directory as the Fleet bundled packages location
        // in order to force Fleet to reach out to the registry to download the
        // packages listed in fleet_packages.json
        // See: https://elastic.slack.com/archives/CNMNXV4RG/p1683033379063079
        `--xpack.fleet.developer.bundledPackageLocation=./inexistentDir`,
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
      ],
    },
  };
}
