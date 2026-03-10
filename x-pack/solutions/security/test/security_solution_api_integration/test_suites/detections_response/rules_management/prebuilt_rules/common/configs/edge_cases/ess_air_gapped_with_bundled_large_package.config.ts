/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import { rmSync } from 'fs';
import { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';
import { FtrConfigProviderContext } from '@kbn/test';
import { PREBUILT_RULES_PACKAGE_NAME } from '@kbn/security-solution-plugin/common/detection_engine/constants';
import { generatePrebuiltRulesPackageZipFile } from '@kbn/security-solution-test-api-clients/prebuilt_rules_package_generation';

const BUNDLED_PACKAGE_DIR = `${os.tmpdir()}/mock_bundled_large_fleet_prebuilt_rules_package`;

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../configs/ess/rules_management.basic.config')
  );

  return {
    ...functionalConfig.getAll(),
    testFiles: [
      require.resolve('../../prebuilt_rules_package/air_gapped/install_large_bundled_package'),
    ],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        /*  Tests in this directory simulate an air-gapped environment in which the instance doesn't have access to EPR.
         *  To do that, we point the Fleet url to an invalid URL, and instruct Fleet to fetch bundled packages at the
         *  location defined in BUNDLED_PACKAGE_DIR.
         *  Since we want to test the installation of a large package, we created a specific package
         *  which contains 15000 rules assets and 750 unique rules, and attempt to install it.
         */
        `--xpack.fleet.isAirGapped=true`,
        `--xpack.fleet.developer.bundledPackageLocation=${BUNDLED_PACKAGE_DIR}`,
      ],
    },
    junit: {
      reportName:
        'Rules Management - Prebuilt Rules (Common) Integration Tests - ESS Basic License (Air Gapped, Large Package)',
    },
    mochaOpts: {
      ...functionalConfig.getAll().mochaOpts,
      rootHooks: {
        beforeAll: setUpLargePrebuiltRulesBundledPackage,
        afterAll: cleanUpBundledPackagesFolder,
      },
    },
  };
}

export const MOCK_PKG_VERSION = '99.1.0';
export const NUM_OF_RULE_IN_MOCK_LARGE_PKG = 3000;

function cleanUpBundledPackagesFolder(): void {
  rmSync(BUNDLED_PACKAGE_DIR, { recursive: true, force: true });
}

async function setUpLargePrebuiltRulesBundledPackage(): Promise<void> {
  cleanUpBundledPackagesFolder();

  const createPrebuiltRuleAsset = (index: number, version: number): PrebuiltRuleAsset => ({
    rule_id: `test-prebuilt-rule-${index}`,
    version,
    type: 'query',
    name: `Mock prebuilt rule ${index} with version ${version}, package ${MOCK_PKG_VERSION}`,
    description: 'Mock prebuilt rule',
    risk_score: 47,
    severity: 'medium',
    from: 'now-30m',
    index: ['test-*'],
    author: ['Elastic'],
    license: 'Elastic License v2',
    query: '*:*',
    language: 'kuery',
    references: ['https://reference-1.mock', 'https://reference-2.mock'],
    setup: 'Some setup guide',
    tags: [
      'Elastic',
      'Cloud',
      'Microsoft 365',
      'Continuous Monitoring',
      'SecOps',
      'Configuration Audit',
    ],
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0010',
          name: 'Exfiltration',
          reference: 'https://attack.mitre.org/tactics/TA0010/',
        },
        technique: [
          {
            id: 'T1537',
            name: 'Transfer Data to Cloud Account',
            reference: 'https://attack.mitre.org/techniques/T1537/',
          },
        ],
      },
    ],
    timestamp_override: 'event.ingested',
  });
  const PREBUILT_RULE_VERSIONS_COUNT = 10;

  const prebuiltRuleAssets: PrebuiltRuleAsset[] = [];

  // Create `NUM_OF_RULE_IN_MOCK_LARGE_PKG` prebuilt rules
  for (let i = 1; i <= NUM_OF_RULE_IN_MOCK_LARGE_PKG; i++) {
    for (let version = 1; version <= PREBUILT_RULE_VERSIONS_COUNT; version++) {
      prebuiltRuleAssets.push(createPrebuiltRuleAsset(i, version));
    }
  }

  await generatePrebuiltRulesPackageZipFile({
    packageName: PREBUILT_RULES_PACKAGE_NAME,
    packageSemver: MOCK_PKG_VERSION,
    prebuiltRuleAssets,
    filePath: `${BUNDLED_PACKAGE_DIR}/${PREBUILT_RULES_PACKAGE_NAME}-${MOCK_PKG_VERSION}.zip`,
  });
}
