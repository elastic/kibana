/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { deepFreeze } from '@kbn/std';
import { SuperTest } from 'supertest';
import {
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectReferenceWithContext,
} from '@kbn/core/server';
import { MULTI_NAMESPACE_SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import {
  expectResponses,
  getUrlPrefix,
} from '../../../saved_object_api_integration/common/lib/saved_object_test_utils';
import {
  ExpectResponseBody,
  TestDefinition,
  TestSuite,
} from '../../../saved_object_api_integration/common/lib/types';

export interface GetShareableReferencesTestDefinition extends TestDefinition {
  request: {
    objects: Array<{ type: string; id: string }>;
  };
}
export type GetShareableReferencesTestSuite = TestSuite<GetShareableReferencesTestDefinition>;
export interface GetShareableReferencesTestCase {
  objects: Array<{ type: string; id: string }>;
  expectedResults: SavedObjectReferenceWithContext[];
}

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
export const TEST_CASE_OBJECTS: Record<string, { type: string; id: string }> = deepFreeze({
  SHAREABLE_TYPE: { type: 'sharedtype', id: CASES.EACH_SPACE.id }, // contains references to four other objects
  SHAREABLE_TYPE_DOES_NOT_EXIST: { type: 'sharedtype', id: 'does-not-exist' },
  NON_SHAREABLE_TYPE: { type: 'isolatedtype', id: 'my_isolated_object' }, // one of these exists in each space
});
// Expected results for each space are defined here since they are used in multiple test suites
export const EXPECTED_RESULTS: Record<string, SavedObjectReferenceWithContext[]> = {
  IN_DEFAULT_SPACE: [
    {
      ...TEST_CASE_OBJECTS.SHAREABLE_TYPE,
      spaces: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID],
      spacesWithMatchingOrigins: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID],
      inboundReferences: [{ type: 'sharedtype', id: CASES.DEFAULT_ONLY.id, name: 'refname' }], // only reflects inbound reference that exist in the default space
    },
    {
      ...TEST_CASE_OBJECTS.SHAREABLE_TYPE_DOES_NOT_EXIST,
      spaces: [],
      inboundReferences: [],
      isMissing: true, // doesn't exist anywhere
    },
    { ...TEST_CASE_OBJECTS.NON_SHAREABLE_TYPE, spaces: [], inboundReferences: [] }, // not missing, but has an empty spaces array because it is not a shareable type
    {
      type: 'sharedtype',
      id: CASES.DEFAULT_ONLY.id,
      spaces: [DEFAULT_SPACE_ID],
      spacesWithMatchingOrigins: [DEFAULT_SPACE_ID], // The first test assertion for spacesWithMatchingOrigins is an object that doesn't have any matching origins in other spaces
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
    },
    {
      type: 'sharedtype',
      id: CASES.SPACE_1_ONLY.id,
      spaces: [],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
      isMissing: true, // doesn't exist in the default space
    },
    {
      type: 'sharedtype',
      id: CASES.SPACE_2_ONLY.id,
      spaces: [],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
      isMissing: true, // doesn't exist in the default space
    },
    {
      type: 'sharedtype',
      id: CASES.ALL_SPACES.id,
      spaces: ['*'],
      spacesWithMatchingOrigins: ['*'],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
    },
  ],
  IN_SPACE_1: [
    {
      ...TEST_CASE_OBJECTS.SHAREABLE_TYPE,
      spaces: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID],
      spacesWithMatchingOrigins: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID],
      inboundReferences: [{ type: 'sharedtype', id: CASES.SPACE_1_ONLY.id, name: 'refname' }], // only reflects inbound reference that exist in space 1
    },
    {
      ...TEST_CASE_OBJECTS.SHAREABLE_TYPE_DOES_NOT_EXIST,
      spaces: [],
      inboundReferences: [],
      isMissing: true, // doesn't exist anywhere
    },
    { ...TEST_CASE_OBJECTS.NON_SHAREABLE_TYPE, spaces: [], inboundReferences: [] }, // not missing, but has an empty spaces array because it is not a shareable type
    {
      type: 'sharedtype',
      id: CASES.DEFAULT_ONLY.id,
      spaces: [],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
      isMissing: true, // doesn't exist in space 1
    },
    {
      type: 'sharedtype',
      id: CASES.SPACE_1_ONLY.id,
      spaces: [SPACE_1_ID],
      spacesWithMatchingAliases: [DEFAULT_SPACE_ID, SPACE_2_ID], // aliases with a matching targetType and sourceId exist in two other spaces
      spacesWithMatchingOrigins: ['other_space', SPACE_1_ID], // The second test assertion for spacesWithMatchingOrigins is an object that has a matching origin in one other space
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
    },
    {
      type: 'sharedtype',
      id: CASES.SPACE_2_ONLY.id,
      spaces: [],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
      isMissing: true, // doesn't exist in space 1
    },
    {
      type: 'sharedtype',
      id: CASES.ALL_SPACES.id,
      spaces: ['*'],
      spacesWithMatchingOrigins: ['*'],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
    },
  ],
  IN_SPACE_2: [
    {
      ...TEST_CASE_OBJECTS.SHAREABLE_TYPE,
      spaces: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID],
      spacesWithMatchingOrigins: [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID],
      inboundReferences: [{ type: 'sharedtype', id: CASES.SPACE_2_ONLY.id, name: 'refname' }], // only reflects inbound reference that exist in space 2
    },
    {
      ...TEST_CASE_OBJECTS.SHAREABLE_TYPE_DOES_NOT_EXIST,
      spaces: [],
      inboundReferences: [],
      isMissing: true, // doesn't exist anywhere
    },
    { ...TEST_CASE_OBJECTS.NON_SHAREABLE_TYPE, spaces: [], inboundReferences: [] }, // not missing, but has an empty spaces array because it is not a shareable type
    {
      type: 'sharedtype',
      id: CASES.DEFAULT_ONLY.id,
      spaces: [],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
      isMissing: true, // doesn't exist in space 2
    },
    {
      type: 'sharedtype',
      id: CASES.SPACE_1_ONLY.id,
      spaces: [],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
      isMissing: true, // doesn't exist in space 2
    },
    {
      type: 'sharedtype',
      id: CASES.SPACE_2_ONLY.id,
      spaces: [SPACE_2_ID],
      spacesWithMatchingOrigins: ['*'], // The third test assertion for spacesWithMatchingOrigins is an object that has a matching origin in all spaces (this takes precedence, causing SPACE_2_ID to be omitted)
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
    },
    {
      type: 'sharedtype',
      id: CASES.ALL_SPACES.id,
      spaces: ['*'],
      spacesWithMatchingOrigins: ['*'],
      inboundReferences: [{ ...TEST_CASE_OBJECTS.SHAREABLE_TYPE, name: 'refname' }],
    },
  ],
};

const createRequest = ({ objects }: GetShareableReferencesTestCase) => ({ objects });
const getTestTitle = ({ objects }: GetShareableReferencesTestCase) => {
  const objStr = objects.map(({ type, id }) => `${type}:${id}`).join(',');
  return `{objects: [${objStr}]}`;
};
const getRedactedSpaces = (authorizedSpace: string | undefined, spaces: string[]) => {
  if (!authorizedSpace) {
    return spaces.sort(); // if authorizedSpace is undefined, we should not redact any spaces
  }
  const redactedSpaces = spaces.map((x) => (x !== authorizedSpace && x !== '*' ? '?' : x));
  return redactedSpaces.sort((a, b) => (a === '?' ? 1 : b === '?' ? -1 : 0)); // unknown spaces are always at the end of the array
};

export function getShareableReferencesTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectForbidden = expectResponses.forbiddenTypes('share_to_space');
  const expectResponseBody =
    (
      testCase: GetShareableReferencesTestCase,
      statusCode: 200 | 403,
      authorizedSpace?: string
    ): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      if (statusCode === 403) {
        const types = testCase.objects.map((x) => x.type);
        await expectForbidden(types)(response);
      } else {
        const { expectedResults } = testCase;
        const apiResponse = response.body as SavedObjectsCollectMultiNamespaceReferencesResponse;
        expect(apiResponse.objects).to.have.length(expectedResults.length);
        expectedResults.forEach((expectedResult, i) => {
          const { spaces, spacesWithMatchingAliases, spacesWithMatchingOrigins } = expectedResult;
          const expectedSpaces = getRedactedSpaces(authorizedSpace, spaces);
          const expectedSpacesWithMatchingAliases =
            spacesWithMatchingAliases &&
            getRedactedSpaces(authorizedSpace, spacesWithMatchingAliases);
          const expectedSpacesWithMatchingOrigins =
            spacesWithMatchingOrigins &&
            getRedactedSpaces(authorizedSpace, spacesWithMatchingOrigins);
          const expected = {
            ...expectedResult,
            spaces: expectedSpaces,
            ...(expectedSpacesWithMatchingAliases && {
              spacesWithMatchingAliases: expectedSpacesWithMatchingAliases,
            }),
            ...(expectedSpacesWithMatchingOrigins && {
              spacesWithMatchingOrigins: expectedSpacesWithMatchingOrigins,
            }),
          };
          expect(apiResponse.objects[i]).to.eql(expected);
        });
      }
    };
  const createTestDefinitions = (
    testCases: GetShareableReferencesTestCase | GetShareableReferencesTestCase[],
    forbidden: boolean,
    options: {
      /** If defined, will expect results to have redacted any spaces that do not match this one. */
      authorizedSpace?: string;
      responseBodyOverride?: ExpectResponseBody;
    } = {}
  ): GetShareableReferencesTestDefinition[] => {
    const cases = Array.isArray(testCases) ? testCases : [testCases];
    const responseStatusCode = forbidden ? 403 : 200;
    return cases.map((x) => ({
      title: getTestTitle(x),
      responseStatusCode,
      request: createRequest(x),
      responseBody:
        options?.responseBodyOverride ||
        expectResponseBody(x, responseStatusCode, options.authorizedSpace),
    }));
  };

  const makeGetShareableReferencesTest =
    (describeFn: Mocha.SuiteFunction) =>
    (description: string, definition: GetShareableReferencesTestSuite) => {
      const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

      describeFn(description, () => {
        before(() =>
          esArchiver.load(
            'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
          )
        );
        after(() =>
          esArchiver.unload(
            'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
          )
        );

        for (const test of tests) {
          it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
            const requestBody = test.request;
            await supertest
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_get_shareable_references`)
              .auth(user?.username, user?.password)
              .send(requestBody)
              .expect(test.responseStatusCode)
              .then(test.responseBody);
          });
        }
      });
    };

  const addTests = makeGetShareableReferencesTest(describe);
  // @ts-ignore
  addTests.only = makeGetShareableReferencesTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}
