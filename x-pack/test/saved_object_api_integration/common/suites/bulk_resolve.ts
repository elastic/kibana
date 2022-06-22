/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { TEST_CASES } from './resolve';
import { SPACES } from '../lib/spaces';
import {
  createRequest,
  expectResponses,
  getUrlPrefix,
  getTestTitle,
} from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite } from '../lib/types';

export interface BulkResolveTestDefinition extends TestDefinition {
  request: Array<{ type: string; id: string }>;
}
export type BulkResolveTestSuite = TestSuite<BulkResolveTestDefinition>;
export interface BulkResolveTestCase extends TestCase {
  expectedOutcome?: 'exactMatch' | 'aliasMatch' | 'conflict';
  expectedId?: string;
  expectedAliasTargetId?: string;
}

export { TEST_CASES }; // re-export the (non-bulk) resolve test cases

export function bulkResolveTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectSavedObjectForbidden = expectResponses.forbiddenTypes('bulk_get');
  const expectResponseBody =
    (
      testCases: BulkResolveTestCase | BulkResolveTestCase[],
      statusCode: 200 | 403
    ): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      const testCaseArray = Array.isArray(testCases) ? testCases : [testCases];
      if (statusCode === 403) {
        const types = testCaseArray.map((x) => x.type);
        await expectSavedObjectForbidden(types)(response);
      } else {
        // permitted
        const resolvedObjects = response.body.resolved_objects;
        expect(resolvedObjects).length(testCaseArray.length);
        for (let i = 0; i < resolvedObjects.length; i++) {
          const resolvedObject = resolvedObjects[i];
          const testCase = testCaseArray[i];
          const { expectedId: id, expectedOutcome, expectedAliasTargetId } = testCase;
          await expectResponses.permitted(resolvedObject.saved_object, {
            ...testCase,
            ...(!testCase.failure && id && { id }), // use expected ID instead of the requested ID iff the case was *not* a failure
          });
          if (!testCase.failure) {
            expect(resolvedObject.outcome).to.eql(expectedOutcome);
            if (expectedOutcome === 'conflict' || expectedOutcome === 'aliasMatch') {
              expect(resolvedObject.alias_target_id).to.eql(expectedAliasTargetId);
            } else {
              expect(resolvedObject.alias_target_id).to.eql(undefined);
            }
            // TODO: add assertions for redacted namespaces (#112455)
          }
        }
      }
    };
  const createTestDefinitions = (
    testCases: BulkResolveTestCase | BulkResolveTestCase[],
    forbidden: boolean,
    options?: {
      spaceId?: string;
      singleRequest?: boolean;
      responseBodyOverride?: ExpectResponseBody;
    }
  ): BulkResolveTestDefinition[] => {
    const cases = Array.isArray(testCases) ? testCases : [testCases];
    const responseStatusCode = forbidden ? 403 : 200;
    if (!options?.singleRequest) {
      // if we are testing cases that should result in a forbidden response, we can do each case individually
      // this ensures that multiple test cases of a single type will each result in a forbidden error
      return cases.map((x) => ({
        title: getTestTitle(x, responseStatusCode),
        request: [createRequest(x)],
        responseStatusCode,
        responseBody: options?.responseBodyOverride || expectResponseBody(x, responseStatusCode),
      }));
    }
    // batch into a single request to save time during test execution
    return [
      {
        title: getTestTitle(cases, responseStatusCode),
        request: cases.map((x) => createRequest(x)),
        responseStatusCode,
        responseBody:
          options?.responseBodyOverride || expectResponseBody(cases, responseStatusCode),
      },
    ];
  };

  const makeBulkResolveTest =
    (describeFn: Mocha.SuiteFunction) =>
    (description: string, definition: BulkResolveTestSuite) => {
      const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

      describeFn(description, () => {
        before(() =>
          esArchiver.load(
            'x-pack/test/saved_object_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
          )
        );
        after(() =>
          esArchiver.unload(
            'x-pack/test/saved_object_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
          )
        );

        for (const test of tests) {
          it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
            await supertest
              .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_bulk_resolve`)
              .auth(user?.username, user?.password)
              .send(test.request)
              .expect(test.responseStatusCode)
              .then(test.responseBody);
          });
        }
      });
    };

  const addTests = makeBulkResolveTest(describe);
  // @ts-ignore
  addTests.only = makeBulkResolveTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
    expectSavedObjectForbidden,
  };
}
