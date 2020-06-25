/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import querystring from 'querystring';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import { expectResponses, getUrlPrefix } from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite } from '../lib/types';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

export interface FindTestDefinition extends TestDefinition {
  request: { query: string };
}
export type FindTestSuite = TestSuite<FindTestDefinition>;
export interface FindTestCase {
  title: string;
  query: string;
  successResult?: {
    savedObjects?: TestCase | TestCase[];
    page?: number;
    perPage?: number;
    total?: number;
  };
  failure?: 400 | 403;
}

export const getTestCases = (spaceId?: string) => ({
  singleNamespaceType: {
    title: 'find single-namespace type',
    query: 'type=isolatedtype&fields=title',
    successResult: {
      savedObjects:
        spaceId === SPACE_1_ID
          ? CASES.SINGLE_NAMESPACE_SPACE_1
          : spaceId === SPACE_2_ID
          ? CASES.SINGLE_NAMESPACE_SPACE_2
          : CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
    },
  } as FindTestCase,
  multiNamespaceType: {
    title: 'find multi-namespace type',
    query: 'type=sharedtype&fields=title',
    successResult: {
      savedObjects:
        spaceId === SPACE_1_ID
          ? [CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, CASES.MULTI_NAMESPACE_ONLY_SPACE_1]
          : spaceId === SPACE_2_ID
          ? CASES.MULTI_NAMESPACE_ONLY_SPACE_2
          : CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
    },
  } as FindTestCase,
  namespaceAgnosticType: {
    title: 'find namespace-agnostic type',
    query: 'type=globaltype&fields=title',
    successResult: { savedObjects: CASES.NAMESPACE_AGNOSTIC },
  } as FindTestCase,
  hiddenType: { title: 'find hidden type', query: 'type=hiddentype&fields=name' } as FindTestCase,
  unknownType: { title: 'find unknown type', query: 'type=wigwags' } as FindTestCase,
  pageBeyondTotal: {
    title: 'find page beyond total',
    query: 'type=isolatedtype&page=100&per_page=100',
    successResult: { page: 100, perPage: 100, total: 1, savedObjects: [] },
  } as FindTestCase,
  unknownSearchField: {
    title: 'find unknown search field',
    query: 'type=url&search_fields=a',
  } as FindTestCase,
  filterWithNamespaceAgnosticType: {
    title: 'filter with namespace-agnostic type',
    query: 'type=globaltype&filter=globaltype.attributes.title:*global*',
    successResult: { savedObjects: CASES.NAMESPACE_AGNOSTIC },
  } as FindTestCase,
  filterWithHiddenType: {
    title: 'filter with hidden type',
    query: `type=hiddentype&fields=name&filter=hiddentype.attributes.title:'hello'`,
  } as FindTestCase,
  filterWithUnknownType: {
    title: 'filter with unknown type',
    query: `type=wigwags&filter=wigwags.attributes.title:'unknown'`,
  } as FindTestCase,
  filterWithDisallowedType: {
    title: 'filter with disallowed type',
    query: `type=globaltype&filter=dashboard.title:'Requests'`,
    failure: 400,
  } as FindTestCase,
});
export const createRequest = ({ query }: FindTestCase) => ({ query });
const getTestTitle = ({ failure, title }: FindTestCase) => {
  let description = 'success';
  if (failure === 400) {
    description = 'bad request';
  } else if (failure === 403) {
    description = 'forbidden';
  }
  return `${description} ["${title}"]`;
};

export function findTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectForbidden = expectResponses.forbidden('find');
  const expectResponseBody = (testCase: FindTestCase): ExpectResponseBody => async (
    response: Record<string, any>
  ) => {
    const { failure, successResult = {}, query } = testCase;
    const parsedQuery = querystring.parse(query);
    if (failure === 403) {
      const type = parsedQuery.type;
      await expectForbidden(type)(response);
    } else if (failure === 400) {
      const type = (parsedQuery.filter as string).split('.')[0];
      expect(response.body.error).to.eql('Bad Request');
      expect(response.body.statusCode).to.eql(failure);
      expect(response.body.message).to.eql(`This type ${type} is not allowed: Bad Request`);
    } else {
      // 2xx
      expect(response.body).not.to.have.property('error');
      const { page = 1, perPage = 20, total, savedObjects = [] } = successResult;
      const savedObjectsArray = Array.isArray(savedObjects) ? savedObjects : [savedObjects];
      expect(response.body.page).to.eql(page);
      expect(response.body.per_page).to.eql(perPage);
      expect(response.body.total).to.eql(total || savedObjectsArray.length);
      for (let i = 0; i < savedObjectsArray.length; i++) {
        const object = response.body.saved_objects[i];
        const { type: expectedType, id: expectedId } = savedObjectsArray[i];
        expect(object.type).to.eql(expectedType);
        expect(object.id).to.eql(expectedId);
        expect(object.updated_at).to.match(/^[\d-]{10}T[\d:\.]{12}Z$/);
        // don't test attributes, version, or references
      }
    }
  };
  const createTestDefinitions = (
    testCases: FindTestCase | FindTestCase[],
    forbidden: boolean,
    options?: {
      responseBodyOverride?: ExpectResponseBody;
    }
  ): FindTestDefinition[] => {
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

  const makeFindTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: FindTestSuite
  ) => {
    const { user, spaceId = DEFAULT_SPACE_ID, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      for (const test of tests) {
        it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
          const query = test.request.query ? `?${test.request.query}` : '';
          await supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find${query}`)
            .auth(user?.username, user?.password)
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeFindTest(describe);
  // @ts-ignore
  addTests.only = makeFindTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}
