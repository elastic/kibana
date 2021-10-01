/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES } from '../../common/lib/spaces';
import {
  disableLegacyUrlAliasesTestSuiteFactory,
  DisableLegacyUrlAliasesTestCase,
  TEST_CASE_TARGET_TYPE,
  TEST_CASE_SOURCE_ID,
} from '../../common/suites/disable_legacy_url_aliases';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const {
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

const createTestCases = (...spaceIds: string[]): DisableLegacyUrlAliasesTestCase[] => {
  return spaceIds.map((targetSpace) => ({
    targetSpace,
    targetType: TEST_CASE_TARGET_TYPE,
    sourceId: TEST_CASE_SOURCE_ID,
  }));
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const { addTests, createTestDefinitions } = disableLegacyUrlAliasesTestSuiteFactory(
    es,
    esArchiver,
    supertest
  );

  const testCases = createTestCases(SPACE_1_ID, SPACE_2_ID);
  const tests = createTestDefinitions(testCases, false);
  addTests(`_disable_legacy_url_aliases`, { tests });
}
