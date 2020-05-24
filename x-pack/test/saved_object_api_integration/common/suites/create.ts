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

export interface CreateTestDefinition extends TestDefinition {
  request: { type: string; id: string };
  overwrite: boolean;
}
export type CreateTestSuite = TestSuite<CreateTestDefinition>;
export interface CreateTestCase extends TestCase {
  failure?: 400 | 403 | 409;
}

const NEW_ATTRIBUTE_KEY = 'title'; // all type mappings include this attribute, for simplicity's sake
const NEW_ATTRIBUTE_VAL = `New attribute value ${Date.now()}`;

// ID intentionally left blank on NEW_SINGLE_NAMESPACE_OBJ to ensure we can create saved objects without specifying the ID
// we could create six separate test cases to test every permutation, but there's no real value in doing so
const NEW_SINGLE_NAMESPACE_OBJ = Object.freeze({ type: 'dashboard', id: '' });
const NEW_MULTI_NAMESPACE_OBJ = Object.freeze({ type: 'sharedtype', id: 'new-sharedtype-id' });
const NEW_NAMESPACE_AGNOSTIC_OBJ = Object.freeze({ type: 'globaltype', id: 'new-globaltype-id' });
export const TEST_CASES = Object.freeze({
  ...CASES,
  NEW_SINGLE_NAMESPACE_OBJ,
  NEW_MULTI_NAMESPACE_OBJ,
  NEW_NAMESPACE_AGNOSTIC_OBJ,
});

export function createTestSuiteFactory(es: any, esArchiver: any, supertest: SuperTest<any>) {
  const expectForbidden = expectResponses.forbidden('create');
  const expectResponseBody = (
    testCase: CreateTestCase,
    spaceId = SPACES.DEFAULT.spaceId
  ): ExpectResponseBody => async (response: Record<string, any>) => {
    if (testCase.failure === 403) {
      await expectForbidden(testCase.type)(response);
    } else {
      // permitted
      const object = response.body;
      await expectResponses.permitted(object, testCase);
      if (!testCase.failure) {
        expect(object.attributes[NEW_ATTRIBUTE_KEY]).to.eql(NEW_ATTRIBUTE_VAL);
        await expectResponses.successCreated(es, spaceId, object.type, object.id);
      }
    }
  };
  const createTestDefinitions = (
    testCases: CreateTestCase | CreateTestCase[],
    forbidden: boolean,
    overwrite: boolean,
    options?: {
      spaceId?: string;
      responseBodyOverride?: ExpectResponseBody;
    }
  ): CreateTestDefinition[] => {
    let cases = Array.isArray(testCases) ? testCases : [testCases];
    if (forbidden) {
      // override the expected result in each test case
      cases = cases.map((x) => ({ ...x, failure: 403 }));
    }
    return cases.map((x) => ({
      title: getTestTitle(x),
      responseStatusCode: x.failure ?? 200,
      request: createRequest(x),
      responseBody: options?.responseBodyOverride || expectResponseBody(x, options?.spaceId),
      overwrite,
    }));
  };

  const makeCreateTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: CreateTestSuite
  ) => {
    const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      for (const test of tests) {
        it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
          const { type, id } = test.request;
          const path = `${type}${id ? `/${id}` : ''}`;
          const requestBody = { attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL } };
          const query = test.overwrite ? '?overwrite=true' : '';
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/${path}${query}`)
            .auth(user?.username, user?.password)
            .send(requestBody)
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeCreateTest(describe);
  // @ts-ignore
  addTests.only = makeCreateTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}
