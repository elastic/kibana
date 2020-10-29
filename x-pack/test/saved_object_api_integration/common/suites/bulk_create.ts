/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES, ALL_SPACES_ID } from '../lib/spaces';
import {
  expectResponses,
  getUrlPrefix,
  getTestTitle,
  getRedactedNamespaces,
} from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite, TestUser } from '../lib/types';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

export interface BulkCreateTestDefinition extends TestDefinition {
  request: Array<{ type: string; id: string }>;
  overwrite: boolean;
}
export type BulkCreateTestSuite = TestSuite<BulkCreateTestDefinition>;
export interface BulkCreateTestCase extends TestCase {
  initialNamespaces?: string[];
  failure?: 400 | 409; // only used for permitted response case
  fail409Param?: string;
}

const NEW_ATTRIBUTE_KEY = 'title'; // all type mappings include this attribute, for simplicity's sake
const NEW_ATTRIBUTE_VAL = `New attribute value ${Date.now()}`;
const EACH_SPACE = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];

const NEW_SINGLE_NAMESPACE_OBJ = Object.freeze({ type: 'dashboard', id: 'new-dashboard-id' });
const NEW_MULTI_NAMESPACE_OBJ = Object.freeze({ type: 'sharedtype', id: 'new-sharedtype-id' });
const NEW_EACH_SPACE_OBJ = Object.freeze({
  type: 'sharedtype',
  id: 'new-each-space-id',
  expectedNamespaces: EACH_SPACE, // expected namespaces of resulting object
  initialNamespaces: EACH_SPACE, // args passed to the bulkCreate method
});
const NEW_ALL_SPACES_OBJ = Object.freeze({
  type: 'sharedtype',
  id: 'new-all-spaces-id',
  expectedNamespaces: [ALL_SPACES_ID], // expected namespaces of resulting object
  initialNamespaces: [ALL_SPACES_ID], // args passed to the bulkCreate method
});
const NEW_NAMESPACE_AGNOSTIC_OBJ = Object.freeze({ type: 'globaltype', id: 'new-globaltype-id' });
export const TEST_CASES: Record<string, BulkCreateTestCase> = Object.freeze({
  ...CASES,
  NEW_SINGLE_NAMESPACE_OBJ,
  NEW_MULTI_NAMESPACE_OBJ,
  NEW_EACH_SPACE_OBJ,
  NEW_ALL_SPACES_OBJ,
  NEW_NAMESPACE_AGNOSTIC_OBJ,
});

const createRequest = ({ type, id, initialNamespaces }: BulkCreateTestCase) => ({
  type,
  id,
  ...(initialNamespaces && { initialNamespaces }),
});

export function bulkCreateTestSuiteFactory(es: any, esArchiver: any, supertest: SuperTest<any>) {
  const expectSavedObjectForbidden = expectResponses.forbiddenTypes('bulk_create');
  const expectResponseBody = (
    testCases: BulkCreateTestCase | BulkCreateTestCase[],
    statusCode: 200 | 403,
    user?: TestUser
  ): ExpectResponseBody => async (response: Record<string, any>) => {
    const testCaseArray = Array.isArray(testCases) ? testCases : [testCases];
    if (statusCode === 403) {
      const types = testCaseArray.map((x) => x.type);
      await expectSavedObjectForbidden(types)(response);
    } else {
      // permitted
      const savedObjects = response.body.saved_objects;
      expect(savedObjects).length(testCaseArray.length);
      for (let i = 0; i < savedObjects.length; i++) {
        const object = savedObjects[i];
        const testCase = testCaseArray[i];
        if (testCase.failure === 409 && testCase.fail409Param === 'unresolvableConflict') {
          const { type, id } = testCase;
          const error = SavedObjectsErrorHelpers.createConflictError(type, id);
          const payload = { ...error.output.payload, metadata: { isNotOverwritable: true } };
          expect(object.type).to.eql(type);
          expect(object.id).to.eql(id);
          expect(object.error).to.eql(payload);
          continue;
        }
        await expectResponses.permitted(object, testCase);
        if (!testCase.failure) {
          expect(object.attributes[NEW_ATTRIBUTE_KEY]).to.eql(NEW_ATTRIBUTE_VAL);
          const redactedNamespaces = getRedactedNamespaces(user, testCase.expectedNamespaces);
          expect(object.namespaces).to.eql(redactedNamespaces);
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
      user?: TestUser;
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
          options?.responseBodyOverride || expectResponseBody(x, responseStatusCode, options?.user),
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
          expectResponseBody(cases, responseStatusCode, options?.user),
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
    expectSavedObjectForbidden,
  };
}
