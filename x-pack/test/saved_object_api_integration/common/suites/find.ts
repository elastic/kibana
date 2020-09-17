/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import querystring from 'querystring';
import { Assign } from '@kbn/utility-types';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import { expectResponses, getUrlPrefix } from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite, TestUser } from '../lib/types';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
} = SPACES;

export interface FindTestDefinition extends TestDefinition {
  request: { query: string };
}
export type FindTestSuite = TestSuite<FindTestDefinition>;

type FindSavedObjectCase = Assign<TestCase, { namespaces: string[] }>;

export interface FindTestCase {
  title: string;
  query: string;
  successResult?: {
    savedObjects?: FindSavedObjectCase | FindSavedObjectCase[];
    page?: number;
    perPage?: number;
    total?: number;
  };
  failure?: {
    statusCode: 400 | 403;
    reason:
      | 'forbidden_types'
      | 'forbidden_namespaces'
      | 'cross_namespace_not_permitted'
      | 'bad_request';
  };
}

// additional sharedtype objects that exist but do not have common test cases defined
const CONFLICT_1_OBJ = Object.freeze({
  type: 'sharedtype',
  id: 'conflict_1',
  namespaces: ['default', 'space_1', 'space_2'],
});
const CONFLICT_2A_OBJ = Object.freeze({
  type: 'sharedtype',
  id: 'conflict_2a',
  originId: 'conflict_2',
  namespaces: ['default', 'space_1', 'space_2'],
});
const CONFLICT_2B_OBJ = Object.freeze({
  type: 'sharedtype',
  id: 'conflict_2b',
  originId: 'conflict_2',
  namespaces: ['default', 'space_1', 'space_2'],
});
const CONFLICT_3_OBJ = Object.freeze({
  type: 'sharedtype',
  id: 'conflict_3',
  namespaces: ['default', 'space_1', 'space_2'],
});
const CONFLICT_4A_OBJ = Object.freeze({
  type: 'sharedtype',
  id: 'conflict_4a',
  originId: 'conflict_4',
  namespaces: ['default', 'space_1', 'space_2'],
});

const TEST_CASES = [
  { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, namespaces: ['default'] },
  { ...CASES.SINGLE_NAMESPACE_SPACE_1, namespaces: ['space_1'] },
  { ...CASES.SINGLE_NAMESPACE_SPACE_2, namespaces: ['space_2'] },
  { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, namespaces: ['default', 'space_1'] },
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, namespaces: ['space_1'] },
  { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, namespaces: ['space_2'] },
  { ...CASES.NAMESPACE_AGNOSTIC, namespaces: undefined },
  { ...CASES.HIDDEN, namespaces: undefined },
];

expect(TEST_CASES.length).to.eql(
  Object.values(CASES).length,
  'Unhandled test cases in `find` suite'
);

export const getTestCases = (
  { currentSpace, crossSpaceSearch }: { currentSpace?: string; crossSpaceSearch?: string[] } = {
    currentSpace: undefined,
    crossSpaceSearch: undefined,
  }
) => {
  const crossSpaceIds = crossSpaceSearch?.filter((s) => s !== (currentSpace ?? 'default')) ?? [];
  const isCrossSpaceSearch = crossSpaceIds.length > 0;
  const isWildcardSearch = crossSpaceIds.includes('*');

  const namespacesQueryParam = isCrossSpaceSearch
    ? `&namespaces=${crossSpaceIds.join('&namespaces=')}`
    : '';

  const buildTitle = (title: string) =>
    crossSpaceSearch ? `${title} (cross-space ${isWildcardSearch ? 'with wildcard' : ''})` : title;

  type CasePredicate = (testCase: TestCase) => boolean;
  const getExpectedSavedObjects = (predicate: CasePredicate) => {
    if (isCrossSpaceSearch) {
      // all other cross-space tests are written to test that we exclude the current space.
      // the wildcard scenario verifies current space functionality
      if (isWildcardSearch) {
        return TEST_CASES.filter(predicate);
      }

      return TEST_CASES.filter((t) => {
        const hasOtherNamespaces =
          Array.isArray(t.namespaces) &&
          t.namespaces!.some((ns) => ns !== (currentSpace ?? 'default'));
        return hasOtherNamespaces && predicate(t);
      });
    }
    return TEST_CASES.filter(
      (t) => (!t.namespaces || t.namespaces.includes(currentSpace ?? 'default')) && predicate(t)
    );
  };

  return {
    singleNamespaceType: {
      title: buildTitle('find single-namespace type'),
      query: `type=isolatedtype&fields=title${namespacesQueryParam}`,
      successResult: {
        savedObjects: getExpectedSavedObjects((t) => t.type === 'isolatedtype'),
      },
    } as FindTestCase,
    multiNamespaceType: {
      title: buildTitle('find multi-namespace type'),
      query: `type=sharedtype&fields=title${namespacesQueryParam}`,
      successResult: {
        // expected depends on which spaces the user is authorized against...
        savedObjects: getExpectedSavedObjects((t) => t.type === 'sharedtype').concat(
          CONFLICT_1_OBJ,
          CONFLICT_2A_OBJ,
          CONFLICT_2B_OBJ,
          CONFLICT_3_OBJ,
          CONFLICT_4A_OBJ
        ),
      },
    } as FindTestCase,
    namespaceAgnosticType: {
      title: buildTitle('find namespace-agnostic type'),
      query: `type=globaltype&fields=title${namespacesQueryParam}`,
      successResult: { savedObjects: CASES.NAMESPACE_AGNOSTIC },
    } as FindTestCase,
    hiddenType: {
      title: buildTitle('find hidden type'),
      query: `type=hiddentype&fields=name${namespacesQueryParam}`,
    } as FindTestCase,
    unknownType: {
      title: buildTitle('find unknown type'),
      query: `type=wigwags${namespacesQueryParam}`,
    } as FindTestCase,
    pageBeyondTotal: {
      title: buildTitle('find page beyond total'),
      query: `type=isolatedtype&page=100&per_page=100${namespacesQueryParam}`,
      successResult: {
        page: 100,
        perPage: 100,
        total: -1,
        savedObjects: [],
      },
    } as FindTestCase,
    unknownSearchField: {
      title: buildTitle('find unknown search field'),
      query: `type=url&search_fields=a${namespacesQueryParam}`,
    } as FindTestCase,
    filterWithNamespaceAgnosticType: {
      title: buildTitle('filter with namespace-agnostic type'),
      query: `type=globaltype&filter=globaltype.attributes.title:*global*${namespacesQueryParam}`,
      successResult: { savedObjects: CASES.NAMESPACE_AGNOSTIC },
    } as FindTestCase,
    filterWithHiddenType: {
      title: buildTitle('filter with hidden type'),
      query: `type=hiddentype&fields=name&filter=hiddentype.attributes.title:'hello'${namespacesQueryParam}`,
    } as FindTestCase,
    filterWithUnknownType: {
      title: buildTitle('filter with unknown type'),
      query: `type=wigwags&filter=wigwags.attributes.title:'unknown'${namespacesQueryParam}`,
    } as FindTestCase,
    filterWithDisallowedType: {
      title: buildTitle('filter with disallowed type'),
      query: `type=globaltype&filter=dashboard.title:'Requests'${namespacesQueryParam}`,
      failure: {
        statusCode: 400,
        reason: 'bad_request',
      },
    } as FindTestCase,
  };
};

export const createRequest = ({ query }: FindTestCase) => ({ query });
const getTestTitle = ({ failure, title }: FindTestCase) => {
  let description = 'success';
  if (failure?.statusCode === 400) {
    description = 'bad request';
  } else if (failure?.statusCode === 403) {
    description = 'forbidden';
  }
  return `${description} ["${title}"]`;
};

export function findTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectForbiddenTypes = expectResponses.forbiddenTypes('find');
  const expectForbiddeNamespaces = expectResponses.forbiddenSpaces;
  const expectResponseBody = (
    testCase: FindTestCase,
    user?: TestUser
  ): ExpectResponseBody => async (response: Record<string, any>) => {
    const { failure, successResult = {}, query } = testCase;
    const parsedQuery = querystring.parse(query);
    if (failure?.statusCode === 403) {
      if (failure?.reason === 'forbidden_types') {
        const type = parsedQuery.type;
        await expectForbiddenTypes(type)(response);
      } else if (failure?.reason === 'forbidden_namespaces') {
        await expectForbiddeNamespaces(response);
      } else {
        throw new Error(`Unexpected failure reason: ${failure?.reason}`);
      }
    } else if (failure?.statusCode === 400) {
      if (failure?.reason === 'bad_request') {
        const type = (parsedQuery.filter as string).split('.')[0];
        expect(response.body.error).to.eql('Bad Request');
        expect(response.body.statusCode).to.eql(failure?.statusCode);
        expect(response.body.message).to.eql(`This type ${type} is not allowed: Bad Request`);
      } else if (failure?.reason === 'cross_namespace_not_permitted') {
        expect(response.body.error).to.eql('Bad Request');
        expect(response.body.statusCode).to.eql(failure?.statusCode);
        expect(response.body.message).to.eql(
          `_find across namespaces is not permitted when the Spaces plugin is disabled.: Bad Request`
        );
      } else {
        throw new Error(`Unexpected failure reason: ${failure?.reason}`);
      }
    } else {
      // 2xx
      expect(response.body).not.to.have.property('error');
      const { page = 1, perPage = 20, total, savedObjects = [] } = successResult;
      const savedObjectsArray = Array.isArray(savedObjects) ? savedObjects : [savedObjects];
      const authorizedSavedObjects = savedObjectsArray.filter(
        (so) =>
          !user ||
          !so.namespaces ||
          so.namespaces.some(
            (ns) => user.authorizedAtSpaces.includes(ns) || user.authorizedAtSpaces.includes('*')
          )
      );
      expect(response.body.page).to.eql(page);
      expect(response.body.per_page).to.eql(perPage);

      // Negative totals are skipped for test simplifications
      if (!total || total >= 0) {
        expect(response.body.total).to.eql(total || authorizedSavedObjects.length);
      }

      authorizedSavedObjects.sort((s1, s2) => (s1.id < s2.id ? -1 : 1));
      response.body.saved_objects.sort((s1: any, s2: any) => (s1.id < s2.id ? -1 : 1));

      for (let i = 0; i < authorizedSavedObjects.length; i++) {
        const object = response.body.saved_objects[i];
        const { type: expectedType, id: expectedId } = authorizedSavedObjects[i];
        expect(object.type).to.eql(expectedType);
        expect(object.id).to.eql(expectedId);
        expect(object.updated_at).to.match(/^[\d-]{10}T[\d:\.]{12}Z$/);
        expect(object.namespaces).to.eql(object.namespaces);
        // don't test attributes, version, or references
      }
    }
  };
  const createTestDefinitions = (
    testCases: FindTestCase | FindTestCase[],
    failure: FindTestCase['failure'] | false,
    options?: {
      user?: TestUser;
      responseBodyOverride?: ExpectResponseBody;
    }
  ): FindTestDefinition[] => {
    let cases = Array.isArray(testCases) ? testCases : [testCases];
    if (failure) {
      // override the expected result in each test case
      cases = cases.map((x) => ({ ...x, failure }));
    }
    return cases.map((x) => ({
      title: getTestTitle(x),
      responseStatusCode: x.failure?.statusCode ?? 200,
      request: createRequest(x),
      responseBody: options?.responseBodyOverride || expectResponseBody(x, options?.user),
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
