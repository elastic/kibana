/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { bulkUpdateTestSuiteFactory, TEST_CASES as CASES } from '../../common/suites/bulk_update';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail404 } = testCaseFailures;

const createTestCases = (spaceId: string) => {
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  const normal = [
    { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail404(spaceId !== DEFAULT_SPACE_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail404(spaceId !== SPACE_2_ID) },
    CASES.MULTI_NAMESPACE_ALL_SPACES,
    {
      ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
      ...fail404(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
    },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail404(spaceId !== SPACE_1_ID) },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail404(spaceId !== SPACE_2_ID) },
    CASES.NAMESPACE_AGNOSTIC,
    { ...CASES.HIDDEN, ...fail404() },
    { ...CASES.DOES_NOT_EXIST, ...fail404() },
  ];

  // an "object namespace" string can be specified for individual objects (to bulkUpdate across namespaces)
  const withObjectNamespaces = [
    { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, namespace: DEFAULT_SPACE_ID },
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, namespace: SPACE_1_ID },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, namespace: SPACE_1_ID, ...fail404() }, // intentional 404 test case
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, namespace: spaceId }, // any spaceId will work (not '*')
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, namespace: DEFAULT_SPACE_ID }, // SPACE_1_ID would also work
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, namespace: SPACE_2_ID, ...fail404() }, // intentional 404 test case
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, namespace: SPACE_2_ID },
    CASES.NAMESPACE_AGNOSTIC, // any namespace would work and would make no difference
    { ...CASES.DOES_NOT_EXIST, ...fail404() },
  ];
  return { normal, withObjectNamespaces };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = bulkUpdateTestSuiteFactory(esArchiver, supertest);
  const createTests = (spaceId: string) => {
    const { normal, withObjectNamespaces } = createTestCases(spaceId);
    return [
      createTestDefinitions(normal, false, { singleRequest: true }),
      createTestDefinitions(withObjectNamespaces, false, { singleRequest: true }),
    ].flat();
  };

  describe('_bulk_update', () => {
    getTestScenarios().spaces.forEach(({ spaceId }) => {
      const tests = createTests(spaceId);
      addTests(`within the ${spaceId} space`, { spaceId, tests });
    });
  });
}
