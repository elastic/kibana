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
import {
  createRequest,
  expectResponses,
  getUrlPrefix,
  getTestTitle,
} from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite } from '../lib/types';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

export interface ResolveTestDefinition extends TestDefinition {
  request: { type: string; id: string };
}
export type ResolveTestSuite = TestSuite<ResolveTestDefinition>;
export interface ResolveTestCase extends TestCase {
  expectedOutcome?: 'exactMatch' | 'aliasMatch' | 'conflict';
  expectedId?: string;
  expectedAliasTargetId?: string;
}

const EACH_SPACE = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];

export const TEST_CASES = Object.freeze({
  EXACT_MATCH: Object.freeze({
    type: 'resolvetype',
    id: 'exact-match',
    expectedNamespaces: EACH_SPACE,
    expectedOutcome: 'exactMatch' as const,
    expectedId: 'exact-match',
  }),
  ALIAS_MATCH: Object.freeze({
    type: 'resolvetype',
    id: 'alias-match',
    expectedNamespaces: EACH_SPACE,
    expectedOutcome: 'aliasMatch' as const,
    expectedId: 'alias-match-newid',
    expectedAliasTargetId: 'alias-match-newid',
  }),
  CONFLICT: Object.freeze({
    type: 'resolvetype',
    id: 'conflict',
    expectedNamespaces: EACH_SPACE,
    expectedOutcome: 'conflict' as const, // only in the default space and space 1, where the alias exists
    expectedId: 'conflict',
    expectedAliasTargetId: 'conflict-newid',
  }),
  DISABLED: Object.freeze({
    type: 'resolvetype',
    id: 'disabled',
  }),
  DOES_NOT_EXIST: Object.freeze({
    type: 'resolvetype',
    id: 'does-not-exist',
  }),
  HIDDEN: CASES.HIDDEN,
});

export function resolveTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectSavedObjectForbidden = expectResponses.forbiddenTypes('get');
  const expectResponseBody =
    (testCase: ResolveTestCase): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      if (testCase.failure === 403) {
        await expectSavedObjectForbidden(testCase.type)(response);
      } else {
        // permitted
        const object = response.body.saved_object || response.body; // errors do not have a saved_object field
        const { expectedId: id, expectedOutcome, expectedAliasTargetId } = testCase;
        await expectResponses.permitted(object, { ...testCase, ...(id && { id }) });
        if (!testCase.failure) {
          expect(response.body.outcome).to.eql(expectedOutcome);
          if (expectedOutcome === 'conflict' || expectedOutcome === 'aliasMatch') {
            expect(response.body.alias_target_id).to.eql(expectedAliasTargetId);
          } else {
            expect(response.body.alias_target_id).to.eql(undefined);
          }
          // TODO: add assertions for redacted namespaces (#112455)
        }
      }
    };
  const createTestDefinitions = (
    testCases: ResolveTestCase | ResolveTestCase[],
    forbidden: boolean,
    options?: {
      spaceId?: string;
      responseBodyOverride?: ExpectResponseBody;
    }
  ): ResolveTestDefinition[] => {
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

  const makeResolveTest =
    (describeFn: Mocha.SuiteFunction) => (description: string, definition: ResolveTestSuite) => {
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
              .get(`${getUrlPrefix(spaceId)}/api/saved_objects/resolve/${type}/${id}`)
              .auth(user?.username, user?.password)
              .expect(test.responseStatusCode)
              .then(test.responseBody);
          });
        }
      });
    };

  const addTests = makeResolveTest(describe);
  // @ts-ignore
  addTests.only = makeResolveTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}
