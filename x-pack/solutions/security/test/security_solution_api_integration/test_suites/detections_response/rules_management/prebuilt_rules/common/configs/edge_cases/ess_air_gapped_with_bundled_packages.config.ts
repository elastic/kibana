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
import {
  ENDPOINT_PACKAGE_NAME,
  PREBUILT_RULES_PACKAGE_NAME,
} from '@kbn/security-solution-plugin/common/detection_engine/constants';
import { generatePrebuiltRulesPackageZipFile } from '@kbn/security-solution-test-api-clients/prebuilt_rules_package_generation';

const BUNDLED_PACKAGE_DIR = `${os.tmpdir()}/mock_bundled_fleet_packages`;

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../configs/ess/rules_management.basic.config')
  );

  return {
    ...functionalConfig.getAll(),
    testFiles: [
      require.resolve('../../import_export/import_with_installing_package'),
      require.resolve('../../prebuilt_rules_package/air_gapped'),
    ],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        /*  Tests in this directory simulate an air-gapped environment in which the instance doesn't have access to EPR.
         *  To do that, we point the Fleet url to an invalid URL, and instruct Fleet to fetch bundled packages at the
         *  location defined in BUNDLED_PACKAGE_DIR.
         */
        `--xpack.fleet.isAirGapped=true`,
        `--xpack.fleet.developer.bundledPackageLocation=${BUNDLED_PACKAGE_DIR}`,
      ],
    },
    junit: {
      reportName:
        'Rules Management - Prebuilt Rules (Common) Integration Tests - ESS Basic License (Air Gapped)',
    },
    mochaOpts: {
      ...functionalConfig.getAll().mochaOpts,
      rootHooks: {
        beforeAll: setUpBundledPackages,
        afterAll: cleanUpBundledPackagesFolder,
      },
    },
  };
}

export const MOCK_PKG_VERSION = '99.0.0';
export const MOCK_BETA_PKG_VERSION = '99.0.1-beta.1';

export const PREBUILT_RULE_ID_A = 'test-prebuilt-rule-a';
export const PREBUILT_RULE_ASSET_A: PrebuiltRuleAsset = {
  rule_id: PREBUILT_RULE_ID_A,
  version: 3,
  type: 'query',
  name: `Mock prebuilt rule A, package ${MOCK_PKG_VERSION}`,
  description: 'Mock prebuilt rule A',
  risk_score: 47,
  severity: 'medium',
  from: 'now-30m',
  index: ['test-*'],
  author: ['Elastic'],
  license: 'Elastic License v2',
  query: '*:*',
  language: 'kuery',
};
export const PREBUILT_RULE_ID_B = 'test-prebuilt-rule-b';
export const PREBUILT_RULE_ASSET_B: PrebuiltRuleAsset = {
  rule_id: PREBUILT_RULE_ID_B,
  version: 3,
  type: 'eql',
  name: `Mock prebuilt rule B, package ${MOCK_PKG_VERSION}`,
  description: 'Mock prebuilt rule B',
  tags: ['custom-tag'],
  risk_score: 47,
  severity: 'medium',
  from: 'now-30m',
  index: ['test-*'],
  author: ['Elastic'],
  license: 'Elastic License v2',
  query: 'any where true',
  language: 'eql',
};

export const PREBUILT_RULE_A_ASSET_ID = `${PREBUILT_RULE_ID_A}_${PREBUILT_RULE_ASSET_A.version}`;
export const PREBUILT_RULE_B_ASSET_ID = `${PREBUILT_RULE_ID_B}_${PREBUILT_RULE_ASSET_B.version}`;

function cleanUpBundledPackagesFolder(): void {
  rmSync(BUNDLED_PACKAGE_DIR, { recursive: true, force: true });
}

async function setUpBundledPackages(): Promise<void> {
  cleanUpBundledPackagesFolder();

  await Promise.all([
    generatePrebuiltRulesPackageZipFile({
      packageName: PREBUILT_RULES_PACKAGE_NAME,
      packageSemver: MOCK_PKG_VERSION,
      prebuiltRuleAssets: [PREBUILT_RULE_ASSET_A, PREBUILT_RULE_ASSET_B],
      filePath: `${BUNDLED_PACKAGE_DIR}/${PREBUILT_RULES_PACKAGE_NAME}-${MOCK_PKG_VERSION}.zip`,
    }),
    generatePrebuiltRulesPackageZipFile({
      packageName: PREBUILT_RULES_PACKAGE_NAME,
      packageSemver: MOCK_PKG_VERSION,
      prebuiltRuleAssets: [
        {
          ...PREBUILT_RULE_ASSET_A,
          name: `Mock prebuilt rule A, package ${MOCK_BETA_PKG_VERSION}`,
          version: PREBUILT_RULE_ASSET_A.version + 1,
        },
        {
          ...PREBUILT_RULE_ASSET_B,
          name: `Mock prebuilt rule B, package ${MOCK_BETA_PKG_VERSION}`,
          version: PREBUILT_RULE_ASSET_B.version + 1,
        },
      ],
      filePath: `${BUNDLED_PACKAGE_DIR}/${PREBUILT_RULES_PACKAGE_NAME}-${MOCK_BETA_PKG_VERSION}.zip`,
    }),
    generatePrebuiltRulesPackageZipFile({
      packageName: ENDPOINT_PACKAGE_NAME,
      packageSemver: MOCK_PKG_VERSION,
      prebuiltRuleAssets: [],
      filePath: `${BUNDLED_PACKAGE_DIR}/${ENDPOINT_PACKAGE_NAME}-${MOCK_PKG_VERSION}.zip`,
    }),
  ]);
}
