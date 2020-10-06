/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SuperTest } from 'supertest';
import expect from '@kbn/expect/expect.js';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import { expectResponses, getUrlPrefix, getTestTitle } from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite } from '../lib/types';

export interface DeleteTestDefinition extends TestDefinition {
  request: { type: string; id: string; force?: boolean };
}
export type DeleteTestSuite = TestSuite<DeleteTestDefinition>;
export interface DeleteTestCase extends TestCase {
  force?: boolean;
  failure?: 400 | 403 | 404;
}

const DOES_NOT_EXIST = Object.freeze({ type: 'dashboard', id: 'does-not-exist' });
export const TEST_CASES: Record<string, DeleteTestCase> = Object.freeze({
  ...CASES,
  DOES_NOT_EXIST,
});

/**
 * Test cases have additional properties that we don't want to send in HTTP Requests
 */
const createRequest = ({ type, id, force }: DeleteTestCase) => ({ type, id, force });

export function deleteTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectSavedObjectForbidden = expectResponses.forbiddenTypes('delete');
  const expectResponseBody = (testCase: DeleteTestCase): ExpectResponseBody => async (
    response: Record<string, any>
  ) => {
    if (testCase.failure === 403) {
      await expectSavedObjectForbidden(testCase.type)(response);
    } else {
      // permitted
      const object = response.body;
      if (testCase.failure) {
        await expectResponses.permitted(object, testCase);
      } else {
        // the success response for `delete` is an empty object
        expect(object).to.eql({});
      }
    }
  };
  const createTestDefinitions = (
    testCases: DeleteTestCase | DeleteTestCase[],
    forbidden: boolean,
    options?: {
      spaceId?: string;
      responseBodyOverride?: ExpectResponseBody;
    }
  ): DeleteTestDefinition[] => {
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

  const makeDeleteTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: DeleteTestSuite
  ) => {
    const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      for (const test of tests) {
        it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
          const { type, id, force } = test.request;
          await supertest
            .delete(`${getUrlPrefix(spaceId)}/api/saved_objects/${type}/${id}`)
            .query({ ...(force && { force }) })
            .auth(user?.username, user?.password)
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeDeleteTest(describe);
  // @ts-ignore
  addTests.only = makeDeleteTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}
