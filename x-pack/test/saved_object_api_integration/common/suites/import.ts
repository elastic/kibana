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

export interface ImportTestDefinition extends TestDefinition {
  request: Array<{ type: string; id: string }>;
}
export type ImportTestSuite = TestSuite<ImportTestDefinition>;
export interface ImportTestCase extends TestCase {
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

export function importTestSuiteFactory(es: any, esArchiver: any, supertest: SuperTest<any>) {
  const expectForbidden = expectResponses.forbiddenTypes('bulk_create');
  const expectResponseBody = (
    testCases: ImportTestCase | ImportTestCase[],
    statusCode: 200 | 403,
    spaceId = SPACES.DEFAULT.spaceId
  ): ExpectResponseBody => async (response: Record<string, any>) => {
    const testCaseArray = Array.isArray(testCases) ? testCases : [testCases];
    if (statusCode === 403) {
      const types = testCaseArray.map((x) => x.type);
      await expectForbidden(types)(response);
    } else {
      // permitted
      const { success, successCount, errors } = response.body;
      const expectedSuccesses = testCaseArray.filter((x) => !x.failure);
      const expectedFailures = testCaseArray.filter((x) => x.failure);
      expect(success).to.eql(expectedFailures.length === 0);
      expect(successCount).to.eql(expectedSuccesses.length);
      if (expectedFailures.length) {
        expect(errors).to.have.length(expectedFailures.length);
      } else {
        expect(response.body).not.to.have.property('errors');
      }
      for (let i = 0; i < expectedSuccesses.length; i++) {
        const { type, id } = expectedSuccesses[i];
        const { _source } = await expectResponses.successCreated(es, spaceId, type, id);
        expect(_source[type][NEW_ATTRIBUTE_KEY]).to.eql(NEW_ATTRIBUTE_VAL);
      }
      for (let i = 0; i < expectedFailures.length; i++) {
        const { type, id, failure } = expectedFailures[i];
        // we don't know the order of the returned errors; search for each one
        const object = (errors as Array<Record<string, unknown>>).find(
          (x) => x.type === type && x.id === id
        );
        expect(object).not.to.be(undefined);
        if (failure === 400) {
          expect(object!.error).to.eql({ type: 'unsupported_type' });
        } else {
          // 409
          expect(object!.error).to.eql({ type: 'conflict' });
        }
      }
    }
  };
  const createTestDefinitions = (
    testCases: ImportTestCase | ImportTestCase[],
    forbidden: boolean,
    options?: {
      spaceId?: string;
      singleRequest?: boolean;
      responseBodyOverride?: ExpectResponseBody;
    }
  ): ImportTestDefinition[] => {
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
      },
    ];
  };

  const makeImportTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: ImportTestSuite
  ) => {
    const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      const attrs = { attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL } };

      for (const test of tests) {
        it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
          const requestBody = test.request
            .map((obj) => JSON.stringify({ ...obj, ...attrs }))
            .join('\n');
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_import`)
            .auth(user?.username, user?.password)
            .attach('file', Buffer.from(requestBody, 'utf8'), 'export.ndjson')
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeImportTest(describe);
  // @ts-ignore
  addTests.only = makeImportTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
    expectForbidden,
  };
}
