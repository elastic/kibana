/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
const INITIAL_NS_SINGLE_NAMESPACE_OBJ_OTHER_SPACE = Object.freeze({
  type: 'isolatedtype',
  id: 'new-other-space-id',
  expectedNamespaces: ['other-space'], // expected namespaces of resulting object
  initialNamespaces: ['other-space'], // args passed to the bulkCreate method
});
const INITIAL_NS_MULTI_NAMESPACE_ISOLATED_OBJ_OTHER_SPACE = Object.freeze({
  type: 'sharecapabletype',
  id: 'new-other-space-id',
  expectedNamespaces: ['other-space'], // expected namespaces of resulting object
  initialNamespaces: ['other-space'], // args passed to the bulkCreate method
});
const INITIAL_NS_MULTI_NAMESPACE_OBJ_EACH_SPACE = Object.freeze({
  type: 'sharedtype',
  id: 'new-each-space-id',
  expectedNamespaces: EACH_SPACE, // expected namespaces of resulting object
  initialNamespaces: EACH_SPACE, // args passed to the bulkCreate method
});
const INITIAL_NS_MULTI_NAMESPACE_OBJ_ALL_SPACES = Object.freeze({
  type: 'sharedtype',
  id: 'new-all-spaces-id',
  expectedNamespaces: [ALL_SPACES_ID], // expected namespaces of resulting object
  initialNamespaces: [ALL_SPACES_ID], // args passed to the bulkCreate method
});
const ALIAS_CONFLICT_OBJ = Object.freeze({ type: 'resolvetype', id: 'alias-match' }); // this fixture was created to test the resolve API, but we are reusing to test the alias conflict error
const NEW_NAMESPACE_AGNOSTIC_OBJ = Object.freeze({ type: 'globaltype', id: 'new-globaltype-id' });
export const TEST_CASES: Record<string, BulkCreateTestCase> = Object.freeze({
  ...CASES,
  NEW_SINGLE_NAMESPACE_OBJ,
  NEW_MULTI_NAMESPACE_OBJ,
  INITIAL_NS_SINGLE_NAMESPACE_OBJ_OTHER_SPACE,
  INITIAL_NS_MULTI_NAMESPACE_ISOLATED_OBJ_OTHER_SPACE,
  INITIAL_NS_MULTI_NAMESPACE_OBJ_EACH_SPACE,
  INITIAL_NS_MULTI_NAMESPACE_OBJ_ALL_SPACES,
  ALIAS_CONFLICT_OBJ,
  NEW_NAMESPACE_AGNOSTIC_OBJ,
});

const createRequest = ({ type, id, initialNamespaces }: BulkCreateTestCase) => ({
  type,
  id,
  ...(initialNamespaces && { initialNamespaces }),
});

export function bulkCreateTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectSavedObjectForbidden = expectResponses.forbiddenTypes('bulk_create');
  const expectResponseBody =
    (
      testCases: BulkCreateTestCase | BulkCreateTestCase[],
      statusCode: 200 | 403,
      user?: TestUser
    ): ExpectResponseBody =>
    async (response: Record<string, any>) => {
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
          if (testCase.failure === 409) {
            const { type, id } = testCase;
            expect(object.type).to.eql(type);
            expect(object.id).to.eql(id);
            let expectedMetadata;
            if (testCase.fail409Param === 'unresolvableConflict') {
              expectedMetadata = { isNotOverwritable: true };
            } else if (testCase.fail409Param === 'aliasConflictDefaultSpace') {
              expectedMetadata = { spacesWithConflictingAliases: ['default'] };
            } else if (testCase.fail409Param === 'aliasConflictSpace1') {
              expectedMetadata = { spacesWithConflictingAliases: ['space_1'] };
            } else if (testCase.fail409Param === 'aliasConflictAllSpaces') {
              expectedMetadata = {
                spacesWithConflictingAliases: ['default', 'space_1', 'space_x'],
              };
            }
            const expectedError = SavedObjectsErrorHelpers.createConflictError(type, id).output
              .payload;
            expect(object.error).be.an('object');
            expect(object.error.statusCode).to.eql(expectedError.statusCode);
            expect(object.error.error).to.eql(expectedError.error);
            expect(object.error.message).to.eql(expectedError.message);
            if (expectedMetadata) {
              const actualMetadata = object.error.metadata ?? {};
              if (actualMetadata.spacesWithConflictingAliases) {
                actualMetadata.spacesWithConflictingAliases =
                  actualMetadata.spacesWithConflictingAliases.sort();
              }
              expect(actualMetadata).to.eql(expectedMetadata);
            } else {
              expect(object.error.metadata).to.be(undefined);
            }
            continue;
          }
          await expectResponses.permitted(object, testCase);
          if (!testCase.failure) {
            expect(object.attributes[NEW_ATTRIBUTE_KEY]).to.eql(NEW_ATTRIBUTE_VAL);
            const redactedNamespaces = getRedactedNamespaces(user, testCase.expectedNamespaces);
            expect(object.namespaces).to.eql(redactedNamespaces);
            // TODO: improve assertions for redacted namespaces? (#112455)
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

  const makeBulkCreateTest =
    (describeFn: Mocha.SuiteFunction) => (description: string, definition: BulkCreateTestSuite) => {
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
