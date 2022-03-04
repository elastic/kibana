/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
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

export interface CreateTestDefinition extends TestDefinition {
  request: { type: string; id: string; initialNamespaces?: string[] };
  overwrite: boolean;
}
export type CreateTestSuite = TestSuite<CreateTestDefinition>;
export interface CreateTestCase extends TestCase {
  initialNamespaces?: string[];
  failure?: 400 | 403 | 409;
}

const NEW_ATTRIBUTE_KEY = 'title'; // all type mappings include this attribute, for simplicity's sake
const NEW_ATTRIBUTE_VAL = `New attribute value ${Date.now()}`;
const EACH_SPACE = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];

// ID intentionally left blank on NEW_SINGLE_NAMESPACE_OBJ to ensure we can create saved objects without specifying the ID
// we could create six separate test cases to test every permutation, but there's no real value in doing so
const NEW_SINGLE_NAMESPACE_OBJ = Object.freeze({ type: 'dashboard', id: '' });
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
export const TEST_CASES: Record<string, CreateTestCase> = Object.freeze({
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

const createRequest = ({ type, id, initialNamespaces }: CreateTestCase) => ({
  type,
  id,
  initialNamespaces,
});

export function createTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectSavedObjectForbidden = expectResponses.forbiddenTypes('create');
  const expectResponseBody =
    (testCase: CreateTestCase, user?: TestUser): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      if (testCase.failure === 403) {
        await expectSavedObjectForbidden(testCase.type)(response);
      } else {
        // permitted
        const object = response.body;
        await expectResponses.permitted(object, testCase);
        if (!testCase.failure) {
          expect(object.attributes[NEW_ATTRIBUTE_KEY]).to.eql(NEW_ATTRIBUTE_VAL);
          const redactedNamespaces = getRedactedNamespaces(user, testCase.expectedNamespaces);
          expect(object.namespaces).to.eql(redactedNamespaces);
          // TODO: improve assertions for redacted namespaces? (#112455)
        }
      }
    };
  const createTestDefinitions = (
    testCases: CreateTestCase | CreateTestCase[],
    forbidden: boolean,
    overwrite: boolean,
    options?: {
      spaceId?: string;
      user?: TestUser;
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
      responseBody: options?.responseBodyOverride || expectResponseBody(x, options?.user),
      overwrite,
    }));
  };

  const makeCreateTest =
    (describeFn: Mocha.SuiteFunction) => (description: string, definition: CreateTestSuite) => {
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
            const { type, id, initialNamespaces } = test.request;
            const path = `${type}${id ? `/${id}` : ''}`;
            const requestBody = {
              attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
              ...(initialNamespaces && { initialNamespaces }),
            };
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
