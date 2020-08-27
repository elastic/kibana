/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { bulkCreateTestSuiteFactory, TEST_CASES as CASES } from '../../common/suites/bulk_create';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail409 } = testCaseFailures;
const unresolvableConflict = (condition?: boolean) =>
  condition !== false ? { fail409Param: 'unresolvableConflict' } : {};

const createTestCases = (overwrite: boolean, spaceId: string) => [
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  {
    ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
    ...fail409(!overwrite && spaceId === DEFAULT_SPACE_ID),
  },
  { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail409(!overwrite && spaceId === SPACE_1_ID) },
  { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail409(!overwrite && spaceId === SPACE_2_ID) },
  {
    ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
    ...fail409(!overwrite || (spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID)),
    ...unresolvableConflict(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
  },
  {
    ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
    ...fail409(!overwrite || spaceId !== SPACE_1_ID),
    ...unresolvableConflict(spaceId !== SPACE_1_ID),
  },
  {
    ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
    ...fail409(!overwrite || spaceId !== SPACE_2_ID),
    ...unresolvableConflict(spaceId !== SPACE_2_ID),
  },
  { ...CASES.NAMESPACE_AGNOSTIC, ...fail409(!overwrite) },
  { ...CASES.HIDDEN, ...fail400() },
  CASES.NEW_SINGLE_NAMESPACE_OBJ,
  CASES.NEW_MULTI_NAMESPACE_OBJ,
  CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const { addTests, createTestDefinitions } = bulkCreateTestSuiteFactory(es, esArchiver, supertest);
  const createTests = (overwrite: boolean, spaceId: string) => {
    const testCases = createTestCases(overwrite, spaceId);
    return createTestDefinitions(testCases, false, overwrite, {
      spaceId,
      singleRequest: true,
    }).concat(
      ['namespace', 'namespaces'].map((key) => ({
        title: `(bad request) when ${key} is specified on the saved object`,
        request: [{ type: 'isolatedtype', id: 'some-id', [key]: 'any-value' }] as any,
        responseStatusCode: 400,
        responseBody: async (response: Record<string, any>) => {
          expect(response.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: `[request body.0.${key}]: definition for this key is missing`,
          });
        },
        overwrite,
      }))
    );
  };

  describe('_bulk_create', () => {
    getTestScenarios([false, true]).spaces.forEach(({ spaceId, modifier: overwrite }) => {
      const suffix = overwrite ? ' with overwrite enabled' : '';
      const tests = createTests(overwrite!, spaceId);
      addTests(`within the ${spaceId} space${suffix}`, { spaceId, tests });
    });
  });
}
