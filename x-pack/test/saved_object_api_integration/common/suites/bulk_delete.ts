/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import { expectResponses, getUrlPrefix, getTestTitle } from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite, TestUser } from '../lib/types';
import { FtrProviderContext } from '../ftr_provider_context';

export interface BulkDeleteTestDefinition extends TestDefinition {
  request: { type: string; id: string; force?: boolean };
  force?: boolean;
}
export type BulkDeleteTestSuite = TestSuite<BulkDeleteTestDefinition>;

export interface BulkDeleteTestCase extends TestCase {
  force?: boolean;
  failure?: 400 | 403 | 404;
}

const ALIAS_DELETE_INCLUSIVE = Object.freeze({
  type: 'resolvetype',
  id: 'alias-match-newid',
}); // exists in three specific spaces; deleting this should also delete the aliases that target it in the default space and space_1
const ALIAS_DELETE_EXCLUSIVE = Object.freeze({
  type: 'resolvetype',
  id: 'all_spaces',
}); // exists in all spaces; deleting this should also delete the aliases that target it in the default space and space_1
const DOES_NOT_EXIST = Object.freeze({ type: 'dashboard', id: 'does-not-exist' });
export const TEST_CASES: Record<string, BulkDeleteTestCase> = Object.freeze({
  ...CASES,
  ALIAS_DELETE_INCLUSIVE,
  ALIAS_DELETE_EXCLUSIVE,
  DOES_NOT_EXIST,
});

/**
 * Test cases have additional properties that we don't want to send in HTTP Requests
 */
const createRequest = ({ type, id, force }: BulkDeleteTestCase) => ({ type, id, force });

export function bulkDeleteTestSuiteFactory(context: FtrProviderContext) {
  const esArchiver = context.getService('esArchiver');
  const supertest = context.getService('supertestWithoutAuth');
  const es = context.getService('es');
  // const log = context.getService('log');

  const expectSavedObjectForbidden = expectResponses.forbiddenTypes('bulk_delete');
  const expectResponseBody =
    (testCase: BulkDeleteTestCase, statusCode: 200 | 403, user?: TestUser): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      if (statusCode === 403) {
        await expectSavedObjectForbidden(testCase.type)(response);
      } else {
        // permitted
        const statuses = response.body.statuses;
        expect(statuses).length([testCase].length);
        for (let i = 0; i < statuses.length; i++) {
          const object = statuses[i];
          expect(object).to.have.keys(['id', 'type', 'success']);
          if (testCase.failure) {
            const { type, id } = testCase;
            expect(object.type).to.eql(type);
            expect(object.id).to.eql(id);
            await expectResponses.permitted(object, testCase);
          } else {
            await es.indices.refresh({ index: '.kibana' }); // alias deletion uses refresh: false, so we need to manually refresh the index before searching
            const searchResponse = await es.search({
              index: '.kibana',
              body: {
                size: 0,
                query: { terms: { type: ['legacy-url-alias'] } },
                track_total_hits: true,
              },
            });

            const expectAliasWasDeleted = !![ALIAS_DELETE_INCLUSIVE, ALIAS_DELETE_EXCLUSIVE].find(
              ({ type, id }) => testCase.type === type && testCase.id === id
            );
            // Eight aliases exist and they are all deleted in the bulk operation.
            // The delete behavior for multinamespace objects shared to more than one space when using force is to delete the object from all the spaces it is shared to.
            expect((searchResponse.hits.total as SearchTotalHits).value).to.eql(
              expectAliasWasDeleted ? 6 : 8
            );
          }
        }
      }
    };

  const createTestDefinitions = (
    testCases: BulkDeleteTestCase | BulkDeleteTestCase[],
    forbidden: boolean,
    options?: {
      spaceId?: string;
      responseBodyOverride?: ExpectResponseBody;
    }
  ): BulkDeleteTestDefinition[] => {
    let cases = Array.isArray(testCases) ? testCases : [testCases];
    const responseStatusCode = forbidden ? 403 : 200;
    if (forbidden) {
      // override the expected result in each test case
      cases = cases.map((x) => ({ ...x, failure: 403 }));
    }
    return cases.map((x) => ({
      title: getTestTitle(x, responseStatusCode),
      responseStatusCode,
      request: createRequest(x),
      responseBody: options?.responseBodyOverride || expectResponseBody(x, responseStatusCode),
    }));
  };

  const makeBulkDeleteTest =
    (describeFn: Mocha.SuiteFunction) => (description: string, definition: BulkDeleteTestSuite) => {
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
          it(`should return ${test.responseStatusCode} ${test.title} `, async () => {
            const { type: testType, id: testId, force: testForce } = test.request;
            const requestBody = [{ type: testType, id: testId }];
            const query = testForce && testForce === true ? '?force=true' : '';
            await supertest
              .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_bulk_delete${query}`)
              .auth(user?.username, user?.password)
              .send(requestBody)
              .expect(test.responseStatusCode)
              .then(test.responseBody);
          });
        }
      });
    };

  const addTests = makeBulkDeleteTest(describe);
  // @ts-ignore
  addTests.only = makeBulkDeleteTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}
