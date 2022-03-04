/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import { expectResponses, getUrlPrefix, getTestTitle } from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite } from '../lib/types';

export interface UpdateTestDefinition extends TestDefinition {
  request: { type: string; id: string; upsert?: boolean };
}
export type UpdateTestSuite = TestSuite<UpdateTestDefinition>;
export interface UpdateTestCase extends TestCase {
  failure?: 403 | 404 | 409;
  upsert?: boolean;
}

const NEW_ATTRIBUTE_KEY = 'title'; // all type mappings include this attribute, for simplicity's sake
const NEW_ATTRIBUTE_VAL = `Updated attribute value ${Date.now()}`;

const ALIAS_CONFLICT_OBJ = Object.freeze({ type: 'resolvetype', id: 'alias-match' }); // this fixture was created to test the resolve API, but we are reusing to test the alias conflict error
const DOES_NOT_EXIST = Object.freeze({ type: 'dashboard', id: 'does-not-exist' });
export const TEST_CASES: Record<string, UpdateTestCase> = Object.freeze({
  ...CASES,
  ALIAS_CONFLICT_OBJ,
  DOES_NOT_EXIST,
});

const createRequest = ({ type, id, upsert }: UpdateTestCase) => ({ type, id, upsert });

export function updateTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectSavedObjectForbidden = expectResponses.forbiddenTypes('update');
  const expectResponseBody =
    (testCase: UpdateTestCase): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      if (testCase.failure === 403) {
        await expectSavedObjectForbidden(testCase.type)(response);
      } else {
        // permitted
        const object = response.body;
        await expectResponses.permitted(object, testCase);
        if (!testCase.failure) {
          expect(object.attributes[NEW_ATTRIBUTE_KEY]).to.eql(NEW_ATTRIBUTE_VAL);
          // TODO: add assertions for redacted namespaces (#112455)
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

  const makeUpdateTest =
    (describeFn: Mocha.SuiteFunction) => (description: string, definition: UpdateTestSuite) => {
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
            const { type, id, upsert } = test.request;
            const attributes = { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL };
            const requestBody = { attributes, ...(upsert && { upsert: attributes }) };
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
