/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import {
  createRequest,
  expectResponses,
  getUrlPrefix,
  getTestTitle,
} from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite } from '../lib/types';

export interface UpdateTestDefinition extends TestDefinition {
  request: { type: string; id: string };
}
export type UpdateTestSuite = TestSuite<UpdateTestDefinition>;
export interface UpdateTestCase extends TestCase {
  failure?: 403 | 404;
}

const NEW_ATTRIBUTE_KEY = 'title'; // all type mappings include this attribute, for simplicity's sake
const NEW_ATTRIBUTE_VAL = `Updated attribute value ${Date.now()}`;

const DOES_NOT_EXIST = Object.freeze({ type: 'dashboard', id: 'does-not-exist' });
export const TEST_CASES = Object.freeze({ ...CASES, DOES_NOT_EXIST });

export function updateTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectForbidden = expectResponses.forbiddenTypes('update');
  const expectResponseBody = (testCase: UpdateTestCase): ExpectResponseBody => async (
    response: Record<string, any>
  ) => {
    if (testCase.failure === 403) {
      await expectForbidden(testCase.type)(response);
    } else {
      // permitted
      const object = response.body;
      await expectResponses.permitted(object, testCase);
      if (!testCase.failure) {
        expect(object.attributes[NEW_ATTRIBUTE_KEY]).to.eql(NEW_ATTRIBUTE_VAL);
      }
    }
  };
  const createTestDefinitions = (
    testCases: UpdateTestCase | UpdateTestCase[],
    forbidden: boolean,
    options?: {
      responseBodyOverride?: ExpectResponseBody;
    }
  ): UpdateTestDefinition[] => {
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

  const makeUpdateTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: UpdateTestSuite
  ) => {
    const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      for (const test of tests) {
        it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
          const { type, id } = test.request;
          const requestBody = { attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL } };
          await supertest
            .put(`${getUrlPrefix(spaceId)}/api/saved_objects/${type}/${id}`)
            .auth(user?.username, user?.password)
            .send(requestBody)
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeUpdateTest(describe);
  // @ts-ignore
  addTests.only = makeUpdateTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}
