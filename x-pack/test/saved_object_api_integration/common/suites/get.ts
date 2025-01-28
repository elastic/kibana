/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent as SuperTestAgent } from 'supertest';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import {
  createRequest,
  expectResponses,
  getUrlPrefix,
  getTestTitle,
} from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite } from '../lib/types';

export interface GetTestDefinition extends TestDefinition {
  request: { type: string; id: string };
}
export type GetTestSuite = TestSuite<GetTestDefinition>;
export type GetTestCase = TestCase;

const DOES_NOT_EXIST = Object.freeze({ type: 'dashboard', id: 'does-not-exist' });
export const TEST_CASES: Record<string, GetTestCase> = Object.freeze({ ...CASES, DOES_NOT_EXIST });

export function getTestSuiteFactory(esArchiver: any, supertest: SuperTestAgent) {
  const expectSavedObjectForbidden = expectResponses.forbiddenTypes('get');
  const expectResponseBody =
    (testCase: GetTestCase): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      if (testCase.failure === 403) {
        await expectSavedObjectForbidden(testCase.type)(response);
      } else {
        // permitted
        const object = response.body;
        await expectResponses.permitted(object, testCase);
        // TODO: add assertions for redacted namespaces (#112455)
      }
    };
  const createTestDefinitions = (
    testCases: GetTestCase | GetTestCase[],
    forbidden: boolean,
    options?: {
      spaceId?: string;
      responseBodyOverride?: ExpectResponseBody;
    }
  ): GetTestDefinition[] => {
    let cases = Array.isArray(testCases) ? testCases : [testCases];
    if (forbidden) {
      // override the expected result in each test case
      cases = cases.map((x) => ({ ...x, failure: 403 }));
    }
    return cases.map((x) => ({
      title: getTestTitle(x),
      responseStatusCode: x.failure ?? 200,
      request: createRequest(x),
      responseBody: options?.responseBodyOverride || expectResponseBody(x),
    }));
  };

  const makeGetTest =
    (describeFn: Mocha.SuiteFunction) => (description: string, definition: GetTestSuite) => {
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
            const { type, id } = test.request;
            await supertest
              .get(`${getUrlPrefix(spaceId)}/api/saved_objects/${type}/${id}`)
              .auth(user?.username!, user?.password!)
              .expect(test.responseStatusCode)
              .then(test.responseBody);
          });
        }
      });
    };

  const addTests = makeGetTest(describe);
  // @ts-ignore
  addTests.only = makeGetTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}
