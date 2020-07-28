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

export interface BulkCreateTestDefinition extends TestDefinition {
  request: Array<{ type: string; id: string }>;
  overwrite: boolean;
}
export type BulkCreateTestSuite = TestSuite<BulkCreateTestDefinition>;
export interface BulkCreateTestCase extends TestCase {
  failure?: 400 | 409; // only used for permitted response case
}

const NEW_ATTRIBUTE_KEY = 'title'; // all type mappings include this attribute, for simplicity's sake
const NEW_ATTRIBUTE_VAL = `New attribute value ${Date.now()}`;

const NEW_SINGLE_NAMESPACE_OBJ = Object.freeze({ type: 'dashboard', id: 'new-dashboard-id' });
const NEW_MULTI_NAMESPACE_OBJ = Object.freeze({ type: 'sharedtype', id: 'new-sharedtype-id' });
const NEW_NAMESPACE_AGNOSTIC_OBJ = Object.freeze({ type: 'globaltype', id: 'new-globaltype-id' });
export const TEST_CASES = Object.freeze({
  ...CASES,
  NEW_SINGLE_NAMESPACE_OBJ,
  NEW_MULTI_NAMESPACE_OBJ,
  NEW_NAMESPACE_AGNOSTIC_OBJ,
});

export function bulkCreateTestSuiteFactory(es: any, esArchiver: any, supertest: SuperTest<any>) {
  const expectForbidden = expectResponses.forbiddenTypes('bulk_create');
  const expectResponseBody = (
    testCases: BulkCreateTestCase | BulkCreateTestCase[],
    statusCode: 200 | 403,
    spaceId = SPACES.DEFAULT.spaceId
  ): ExpectResponseBody => async (response: Record<string, any>) => {
    const testCaseArray = Array.isArray(testCases) ? testCases : [testCases];
    if (statusCode === 403) {
      const types = testCaseArray.map((x) => x.type);
      await expectForbidden(types)(response);
    } else {
      // permitted
      const savedObjects = response.body.saved_objects;
      expect(savedObjects).length(testCaseArray.length);
      for (let i = 0; i < savedObjects.length; i++) {
        const object = savedObjects[i];
        const testCase = testCaseArray[i];
        await expectResponses.permitted(object, testCase);
        if (!testCase.failure) {
          expect(object.attributes[NEW_ATTRIBUTE_KEY]).to.eql(NEW_ATTRIBUTE_VAL);
          await expectResponses.successCreated(es, spaceId, object.type, object.id);
        }
      }
    }
  };
  const createTestDefinitions = (
    testCases: BulkCreateTestCase | BulkCreateTestCase[],
    forbidden: boolean,
    overwrite: boolean,
    options?: {
      spaceId?: string;
      singleRequest?: boolean;
      responseBodyOverride?: ExpectResponseBody;
    }
  ): BulkCreateTestDefinition[] => {
    const cases = Array.isArray(testCases) ? testCases : [testCases];
    const responseStatusCode = forbidden ? 403 : 200;
    if (!options?.singleRequest) {
      // if we are testing cases that should result in a forbidden response, we can do each case individually
      // this ensures that multiple test cases of a single type will each result in a forbidden error
      return cases.map((x) => ({
        title: getTestTitle(x, responseStatusCode),
        request: [createRequest(x)],
        responseStatusCode,
        responseBody:
          options?.responseBodyOverride ||
          expectResponseBody(x, responseStatusCode, options?.spaceId),
        overwrite,
      }));
    }
    // batch into a single request to save time during test execution
    return [
      {
        title: getTestTitle(cases, responseStatusCode),
        request: cases.map((x) => createRequest(x)),
        responseStatusCode,
        responseBody:
          options?.responseBodyOverride ||
          expectResponseBody(cases, responseStatusCode, options?.spaceId),
        overwrite,
      },
    ];
  };

  const makeBulkCreateTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: BulkCreateTestSuite
  ) => {
    const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      const attrs = { attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL } };

      for (const test of tests) {
        it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
          const requestBody = test.request.map((x) => ({ ...x, ...attrs }));
          const query = test.overwrite ? '?overwrite=true' : '';
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_bulk_create${query}`)
            .auth(user?.username, user?.password)
            .send(requestBody)
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeBulkCreateTest(describe);
  // @ts-ignore
  addTests.only = makeBulkCreateTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
    expectForbidden,
  };
}
