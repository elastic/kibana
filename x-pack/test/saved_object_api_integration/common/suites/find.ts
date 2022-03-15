/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import querystring from 'querystring';
import {
  SAVED_OBJECT_TEST_CASES,
  CONFLICT_TEST_CASES,
  OTHER_TEST_CASES,
} from '../lib/saved_object_test_cases';
import { SPACES, ALL_SPACES_ID } from '../lib/spaces';
import {
  getUrlPrefix,
  isUserAuthorizedAtSpace,
  getRedactedNamespaces,
} from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite, TestUser } from '../lib/types';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
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
  failure?: {
    statusCode: 200 | 400; // if the user searches for types and/or namespaces they are not authorized for, they will get a 200 result with those types/namespaces omitted
    reason: 'unauthorized' | 'cross_namespace_not_permitted' | 'bad_request';
  };
}

const TEST_CASES = [
  ...Object.values(SAVED_OBJECT_TEST_CASES),
  ...Object.values(CONFLICT_TEST_CASES),
  ...Object.values(OTHER_TEST_CASES),
];

export const getTestCases = (
  { currentSpace, crossSpaceSearch }: { currentSpace?: string; crossSpaceSearch?: string[] } = {
    currentSpace: undefined,
    crossSpaceSearch: undefined,
  }
) => {
  const crossSpaceIds =
    crossSpaceSearch?.filter((s) => s !== (currentSpace ?? DEFAULT_SPACE_ID)) ?? []; // intentionally exclude the current space
  const isCrossSpaceSearch = crossSpaceIds.length > 0;
  const isWildcardSearch = crossSpaceIds.includes('*');

  const namespacesQueryParam = isCrossSpaceSearch
    ? `&namespaces=${crossSpaceIds.join('&namespaces=')}`
    : '';

  const buildTitle = (title: string) =>
    crossSpaceSearch ? `${title} (cross-space${isWildcardSearch ? ' with wildcard' : ''})` : title;

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
          !t.expectedNamespaces || // namespace-agnostic types do not have an expectedNamespaces field
          t.expectedNamespaces.some(
            (ns) => ns === ALL_SPACES_ID || ns !== (currentSpace ?? DEFAULT_SPACE_ID)
          );
        return hasOtherNamespaces && predicate(t);
      });
    }
    return TEST_CASES.filter(
      (t) =>
        (!t.expectedNamespaces ||
          t.expectedNamespaces.includes(ALL_SPACES_ID) ||
          t.expectedNamespaces.includes(currentSpace ?? DEFAULT_SPACE_ID)) &&
        predicate(t)
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
        savedObjects: getExpectedSavedObjects((t) => t.type === 'sharedtype'),
      },
    } as FindTestCase,
    multiNamespaceIsolatedType: {
      title: buildTitle('find multi-namespace isolated type'),
      query: `type=sharecapabletype&fields=title${namespacesQueryParam}`,
      successResult: {
        savedObjects: getExpectedSavedObjects((t) => t.type === 'sharecapabletype'),
      },
    } as FindTestCase,
    namespaceAgnosticType: {
      title: buildTitle('find namespace-agnostic type'),
      query: `type=globaltype&fields=title${namespacesQueryParam}`,
      successResult: { savedObjects: SAVED_OBJECT_TEST_CASES.NAMESPACE_AGNOSTIC },
    } as FindTestCase,
    hiddenType: {
      title: buildTitle('find hidden type'),
      query: `type=hiddentype&fields=name${namespacesQueryParam}`,
    } as FindTestCase,
    unknownType: {
      title: buildTitle('find unknown type'),
      query: `type=wigwags${namespacesQueryParam}`,
    } as FindTestCase,
    eachType: {
      title: buildTitle('find each type'),
      query: `type=isolatedtype&type=sharedtype&type=globaltype&type=hiddentype&type=wigwags${namespacesQueryParam}`,
      successResult: {
        savedObjects: getExpectedSavedObjects((t) =>
          ['isolatedtype', 'sharedtype', 'globaltype'].includes(t.type)
        ),
      },
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
      successResult: { savedObjects: SAVED_OBJECT_TEST_CASES.NAMESPACE_AGNOSTIC },
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

function objectComparator(a: { id: string }, b: { id: string }) {
  return a.id > b.id ? 1 : a.id < b.id ? -1 : 0;
}

export const createRequest = ({ query }: FindTestCase) => ({ query });
const getTestTitle = ({ failure, title }: FindTestCase) =>
  `${failure?.reason || 'success'} ["${title}"]`;

export function findTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectResponseBody =
    (testCase: FindTestCase, user?: TestUser): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      const { failure, successResult = {}, query } = testCase;
      const parsedQuery = querystring.parse(query);
      if (failure?.statusCode === 200) {
        if (failure?.reason === 'unauthorized') {
          // if the user is completely unauthorized, they will receive an empty response body
          const expected = {
            page: parsedQuery.page || 1,
            per_page: parsedQuery.per_page || 20,
            total: 0,
            saved_objects: [],
          };
          expect(response.body).to.eql(expected);
        } else {
          throw new Error(`Unexpected failure reason: ${failure.reason}`);
        }
      } else if (failure?.statusCode === 400) {
        if (failure.reason === 'bad_request') {
          const type = (parsedQuery.filter as string).split('.')[0];
          expect(response.body.error).to.eql('Bad Request');
          expect(response.body.statusCode).to.eql(failure.statusCode);
          expect(response.body.message).to.eql(`This type ${type} is not allowed: Bad Request`);
        } else if (failure.reason === 'cross_namespace_not_permitted') {
          expect(response.body.error).to.eql('Bad Request');
          expect(response.body.statusCode).to.eql(failure.statusCode);
          expect(response.body.message).to.eql(
            `_find across namespaces is not permitted when the Spaces plugin is disabled.: Bad Request`
          );
        } else {
          throw new Error(`Unexpected failure reason: ${failure.reason}`);
        }
      } else {
        // 2xx
        expect(response.body).not.to.have.property('error');
        const { page = 1, perPage = 20, total, savedObjects = [] } = successResult;
        const savedObjectsArray = Array.isArray(savedObjects) ? savedObjects : [savedObjects];
        const authorizedSavedObjects = savedObjectsArray.filter(
          (so) =>
            !so.expectedNamespaces ||
            so.expectedNamespaces.some((x) => isUserAuthorizedAtSpace(user, x))
        );
        expect(response.body.page).to.eql(page);
        expect(response.body.per_page).to.eql(perPage);

        // Negative totals are skipped for test simplifications
        if (!total || total >= 0) {
          expect(response.body.total).to.eql(total || authorizedSavedObjects.length);
        }

        authorizedSavedObjects.sort(objectComparator);
        response.body.saved_objects.sort(objectComparator);

        for (let i = 0; i < authorizedSavedObjects.length; i++) {
          const object = response.body.saved_objects[i];
          const expected = authorizedSavedObjects[i];
          const expectedNamespaces = getRedactedNamespaces(user, expected.expectedNamespaces);
          expect(object.type).to.eql(expected.type);
          expect(object.id).to.eql(expected.id);
          expect(object.updated_at).to.match(/^[\d-]{10}T[\d:\.]{12}Z$/);
          expect(object.namespaces).to.eql(expectedNamespaces);
          // TODO: improve assertions for redacted namespaces? (#112455)
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

  const makeFindTest =
    (describeFn: Mocha.SuiteFunction) => (description: string, definition: FindTestSuite) => {
      const { user, spaceId = DEFAULT_SPACE_ID, tests } = definition;

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
