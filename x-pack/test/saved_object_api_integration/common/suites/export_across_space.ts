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
import { getUrlPrefix } from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestDefinition, TestSuite, TestCase } from '../lib/types';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

export interface AcrossSpaceExportTestDefinition extends TestDefinition {
  request: ReturnType<typeof createRequest>;
}

export type AcrossSpaceExportTestSuite = TestSuite<AcrossSpaceExportTestDefinition>;

interface SuccessResult {
  type: string;
  id: string;
  namespaces?: string[];
  originId?: string;
}

interface CommonAcrossSpaceExportTestCase {
  title: string;
  successResult?: SuccessResult | SuccessResult[];
  failure?: {
    statusCode: 400 | 403; // if the user searches for only types they are not authorized for, they will get a 400 bad request
    reason: 'forbidden' | 'bad_request' | 'non_exportable';
  };
}

interface ByIdObjectIdentifier {
  type: string;
  id: string;
  namespace?: string;
  namespaces?: string[];
}

export interface ByIdAcrossSpaceExportTestCase extends CommonAcrossSpaceExportTestCase {
  objects: ByIdObjectIdentifier[];
}

export interface ByTypeAcrossSpaceExportTestCase extends CommonAcrossSpaceExportTestCase {
  types: string[];
  namespaces?: string[];
}

export type AcrossSpaceExportTestCase =
  | ByIdAcrossSpaceExportTestCase
  | ByTypeAcrossSpaceExportTestCase;

export const isByIdTestCase = (
  testCase: AcrossSpaceExportTestCase
): testCase is ByIdAcrossSpaceExportTestCase => {
  return (testCase as ByIdAcrossSpaceExportTestCase).objects !== undefined;
};

export const isByTypeTestCase = (
  testCase: AcrossSpaceExportTestCase
): testCase is ByTypeAcrossSpaceExportTestCase => {
  return (testCase as ByTypeAcrossSpaceExportTestCase).types !== undefined;
};

// additional sharedtype objects that exist but do not have common test cases defined
const CID = 'conflict_';
const CONFLICT_1_OBJ = Object.freeze({
  type: 'sharedtype',
  id: `${CID}1`,
  namespaces: ['default', 'space_1', 'space_2'],
});
const CONFLICT_2A_OBJ = Object.freeze({
  type: 'sharedtype',
  id: `${CID}2a`,
  originId: `${CID}2`,
  namespaces: ['default', 'space_1', 'space_2'],
});
const CONFLICT_2B_OBJ = Object.freeze({
  type: 'sharedtype',
  id: `${CID}2b`,
  originId: `${CID}2`,
  namespaces: ['default', 'space_1', 'space_2'],
});
const CONFLICT_3_OBJ = Object.freeze({
  type: 'sharedtype',
  id: `${CID}3`,
  namespaces: ['default', 'space_1', 'space_2'],
});
const CONFLICT_4A_OBJ = Object.freeze({
  type: 'sharedtype',
  id: `${CID}4a`,
  originId: `${CID}4`,
  namespaces: ['default', 'space_1', 'space_2'],
});

const testCaseToObj = (testCase: TestCase): ByIdObjectIdentifier => ({
  type: testCase.type,
  id: testCase.id,
  namespaces: testCase.expectedNamespaces,
  namespace:
    testCase.expectedNamespaces && testCase.expectedNamespaces.length
      ? testCase.expectedNamespaces[0]
      : undefined,
});

const testCaseToSuccessResult = (testCase: TestCase): SuccessResult => ({
  type: testCase.type,
  id: testCase.id,
  namespaces: testCase.expectedNamespaces,
});

const bySpace = <T>(map: Record<string, T>, space?: string): T => {
  if (space) {
    return map[space];
  }
  return map[DEFAULT_SPACE_ID];
};

export const getTestCases = (spaceId?: string): { [key: string]: AcrossSpaceExportTestCase } => ({
  // a single NS object by id in the current space
  singleNamespaceObjectFromCurrentSpace: {
    title: 'single-namespace object from current space',
    objects: [
      bySpace(
        {
          [SPACE_1_ID]: CASES.SINGLE_NAMESPACE_SPACE_1,
          [SPACE_2_ID]: CASES.SINGLE_NAMESPACE_SPACE_2,
          [DEFAULT_SPACE_ID]: CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
        },
        spaceId
      ),
    ].map(testCaseToObj),
  },
  // a single NS object by type when requesting the current namespace
  singleNamespaceTypeFromCurrentSpace: {
    // this test explicitly ensures that single-namespace objects from other spaces are not returned
    title: 'single-namespace type from current space',
    types: ['isolatedtype'],
    namespaces: [spaceId ?? DEFAULT_SPACE_ID],
    successResult: [
      bySpace(
        {
          [SPACE_1_ID]: CASES.SINGLE_NAMESPACE_SPACE_1,
          [SPACE_2_ID]: CASES.SINGLE_NAMESPACE_SPACE_2,
          [DEFAULT_SPACE_ID]: CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
        },
        spaceId
      ),
    ].map(testCaseToSuccessResult),
  },
  multiNamespaceObjectFromCurrentSpace: {
    title: 'multi-namespace object',
    objects: [
      bySpace(
        {
          [SPACE_1_ID]: CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
          [SPACE_2_ID]: CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
          [DEFAULT_SPACE_ID]: CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
        },
        spaceId
      ),
    ].map(testCaseToObj),
  },
  multiNamespaceTypeFromCurrentSpace: {
    title: 'multi-namespace type',
    types: ['sharedtype'],
    namespaces: [spaceId ?? DEFAULT_SPACE_ID],
    successResult: [
      ...[
        CASES.MULTI_NAMESPACE_ALL_SPACES,
        ...bySpace(
          {
            [SPACE_1_ID]: [
              CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
              CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
            ],
            [SPACE_2_ID]: [CASES.MULTI_NAMESPACE_ONLY_SPACE_2],
            [DEFAULT_SPACE_ID]: [CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1],
          },
          spaceId
        ),
      ].map(testCaseToSuccessResult),
      ...[CONFLICT_1_OBJ, CONFLICT_2A_OBJ, CONFLICT_2B_OBJ, CONFLICT_3_OBJ, CONFLICT_4A_OBJ],
    ],
  },
  namespaceAgnosticObjectFromCurrentSpace: {
    title: 'namespace-agnostic object',
    objects: [{ ...CASES.NAMESPACE_AGNOSTIC, expectedNamespaces: [] }].map(testCaseToObj),
  },
  namespaceAgnosticTypeFromCurrentSpace: {
    title: 'namespace-agnostic type',
    types: ['globaltype'],
    namespaces: [spaceId ?? DEFAULT_SPACE_ID],
    successResult: [CASES.NAMESPACE_AGNOSTIC].map(testCaseToSuccessResult),
  },
  hiddenObjectFromCurrentSpace: {
    title: 'hidden object',
    objects: [CASES.HIDDEN].map(testCaseToObj),
    failure: { statusCode: 400, reason: 'non_exportable' },
  },
  hiddenTypeFromCurrentSpace: {
    title: 'hidden type',
    types: ['hiddentype'],
    namespaces: [spaceId ?? DEFAULT_SPACE_ID],
    failure: { statusCode: 400, reason: 'non_exportable' },
  },
  ...(spaceId !== SPACE_2_ID && {
    // we do not have a multi-namespace isolated object in Space 2
    multiNamespaceIsolatedObjectFromCurrentSpace: {
      title: 'multi-namespace isolated object',
      objects: [
        bySpace(
          {
            [SPACE_1_ID]: CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1,
            [DEFAULT_SPACE_ID]: CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE,
          },
          spaceId
        ),
      ].map(testCaseToObj),
    },
  }),
  multiNamespaceIsolatedTypeFromCurrentSpace: {
    title: 'multi-namespace isolated type',
    namespaces: [spaceId ?? DEFAULT_SPACE_ID],
    types: ['sharecapabletype'],

    successResult: [
      ...bySpace(
        {
          [SPACE_1_ID]: [CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1],
          [SPACE_2_ID]: [],
          [DEFAULT_SPACE_ID]: [CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE],
        },
        spaceId
      ),
    ].map(testCaseToSuccessResult),
  },

  // exporting from other space

  // a single NS object by id in the other space
  singleNamespaceObjectFromOtherSpace: {
    title: 'single-namespace object from other space',
    objects: [
      bySpace(
        {
          [SPACE_1_ID]: CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
          [SPACE_2_ID]: CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
          [DEFAULT_SPACE_ID]: CASES.SINGLE_NAMESPACE_SPACE_1,
        },
        spaceId
      ),
    ].map(testCaseToObj),
  },
  // a single NS object by type when requesting the other namespace
  singleNamespaceTypeFromOtherSpace: {
    // this test explicitly ensures that single-namespace objects from other spaces are not returned
    title: 'single-namespace type from other space',
    types: ['isolatedtype'],
    namespaces: [
      bySpace(
        {
          [SPACE_1_ID]: DEFAULT_SPACE_ID,
          [SPACE_2_ID]: DEFAULT_SPACE_ID,
          [DEFAULT_SPACE_ID]: SPACE_1_ID,
        },
        spaceId
      ),
    ],
    successResult: [
      bySpace(
        {
          [SPACE_1_ID]: CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
          [SPACE_2_ID]: CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
          [DEFAULT_SPACE_ID]: CASES.SINGLE_NAMESPACE_SPACE_1,
        },
        spaceId
      ),
    ].map(testCaseToSuccessResult),
  },
  multiNamespaceObjectFromOtherSpace: {
    title: 'multi-namespace object from other space',
    objects: [
      bySpace(
        {
          [SPACE_1_ID]: CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
          [SPACE_2_ID]: CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
          [DEFAULT_SPACE_ID]: CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
        },
        spaceId
      ),
    ].map(testCaseToObj),
  },
  multiNamespaceTypeFromOtherSpace: {
    title: 'multi-namespace type from other space',
    types: ['sharedtype'],
    namespaces: [
      bySpace(
        {
          [SPACE_1_ID]: DEFAULT_SPACE_ID,
          [SPACE_2_ID]: DEFAULT_SPACE_ID,
          [DEFAULT_SPACE_ID]: SPACE_1_ID,
        },
        spaceId
      ),
    ],
    successResult: [
      ...[
        CASES.MULTI_NAMESPACE_ALL_SPACES,
        ...bySpace(
          {
            [SPACE_1_ID]: [CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1],
            [SPACE_2_ID]: [CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1],
            [DEFAULT_SPACE_ID]: [
              CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
              CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
            ],
          },
          spaceId
        ),
      ].map(testCaseToSuccessResult),
      ...[CONFLICT_1_OBJ, CONFLICT_2A_OBJ, CONFLICT_2B_OBJ, CONFLICT_3_OBJ, CONFLICT_4A_OBJ],
    ],
  },
  namespaceAgnosticTypeFromOtherSpace: {
    title: 'namespace-agnostic type from other space',
    types: ['globaltype'],
    namespaces: [
      bySpace(
        {
          [SPACE_1_ID]: DEFAULT_SPACE_ID,
          [SPACE_2_ID]: DEFAULT_SPACE_ID,
          [DEFAULT_SPACE_ID]: SPACE_1_ID,
        },
        spaceId
      ),
    ],
    successResult: [CASES.NAMESPACE_AGNOSTIC].map(testCaseToSuccessResult),
  },
  hiddenTypeFromOtherSpace: {
    title: 'hidden type',
    types: ['hiddentype'],
    namespaces: [
      bySpace(
        {
          [SPACE_1_ID]: DEFAULT_SPACE_ID,
          [SPACE_2_ID]: DEFAULT_SPACE_ID,
          [DEFAULT_SPACE_ID]: SPACE_1_ID,
        },
        spaceId
      ),
    ],
    failure: { statusCode: 400, reason: 'non_exportable' },
  },
  ...(spaceId !== SPACE_2_ID && {
    // we do not have a multi-namespace isolated object in Space 2
    multiNamespaceIsolatedObjectFromOtherSpace: {
      title: 'multi-namespace isolated object from other space',
      objects: [
        bySpace(
          {
            [SPACE_1_ID]: CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE,
            [DEFAULT_SPACE_ID]: CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1,
          },
          spaceId
        ),
      ].map(testCaseToObj),
    },
  }),
  multiNamespaceIsolatedTypeFromOtherSpace: {
    title: 'multi-namespace isolated type from other space',
    types: ['sharecapabletype'],
    namespaces: [
      bySpace(
        {
          [SPACE_1_ID]: DEFAULT_SPACE_ID,
          [SPACE_2_ID]: DEFAULT_SPACE_ID,
          [DEFAULT_SPACE_ID]: SPACE_1_ID,
        },
        spaceId
      ),
    ],

    successResult: [
      ...bySpace(
        {
          [SPACE_1_ID]: [CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE],
          [SPACE_2_ID]: [CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE],
          [DEFAULT_SPACE_ID]: [CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1],
        },
        spaceId
      ),
    ].map(testCaseToSuccessResult),
  },

  // mixed export

  singleNamespaceObjectFromMixedSpaces: {
    title: 'single-namespace object from mixed spaces',
    objects: [
      ...bySpace(
        {
          [SPACE_1_ID]: [CASES.SINGLE_NAMESPACE_SPACE_1, CASES.SINGLE_NAMESPACE_DEFAULT_SPACE],
          [SPACE_2_ID]: [CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, CASES.SINGLE_NAMESPACE_SPACE_2],
          [DEFAULT_SPACE_ID]: [
            CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
            CASES.SINGLE_NAMESPACE_SPACE_1,
          ],
        },
        spaceId
      ),
    ].map(testCaseToObj),
  },
  singleNamespaceTypeFromMixedSpaces: {
    // this test explicitly ensures that single-namespace objects from other spaces are not returned
    title: 'single-namespace type from mixed spaces',
    types: ['isolatedtype'],
    namespaces: [
      ...bySpace(
        {
          [SPACE_1_ID]: [DEFAULT_SPACE_ID, SPACE_1_ID],
          [SPACE_2_ID]: [DEFAULT_SPACE_ID, SPACE_2_ID],
          [DEFAULT_SPACE_ID]: [DEFAULT_SPACE_ID, SPACE_1_ID],
        },
        spaceId
      ),
    ],
    successResult: [
      ...bySpace(
        {
          [SPACE_1_ID]: [CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, CASES.SINGLE_NAMESPACE_SPACE_1],
          [SPACE_2_ID]: [CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, CASES.SINGLE_NAMESPACE_SPACE_2],
          [DEFAULT_SPACE_ID]: [
            CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
            CASES.SINGLE_NAMESPACE_SPACE_1,
          ],
        },
        spaceId
      ),
    ].map(testCaseToSuccessResult),
  },

  multiNamespaceObjectFromMixedSpaces: {
    title: 'multi-namespace object from mixed spaces',
    objects: [
      ...bySpace(
        {
          [SPACE_1_ID]: [
            CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
            CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
          ],
          [SPACE_2_ID]: [
            CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
            CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
          ],
          [DEFAULT_SPACE_ID]: [
            CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
            CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
          ],
        },
        spaceId
      ),
    ].map(testCaseToObj),
  },
  multiNamespaceTypeFromMixedSpaces: {
    title: 'multi-namespace type from mixed spaces',
    types: ['sharedtype'],
    namespaces: [
      ...bySpace(
        {
          [SPACE_1_ID]: [DEFAULT_SPACE_ID, SPACE_1_ID],
          [SPACE_2_ID]: [DEFAULT_SPACE_ID, SPACE_2_ID],
          [DEFAULT_SPACE_ID]: [DEFAULT_SPACE_ID, SPACE_1_ID],
        },
        spaceId
      ),
    ],
    successResult: [
      ...[
        CASES.MULTI_NAMESPACE_ALL_SPACES,
        ...bySpace(
          {
            [SPACE_1_ID]: [
              CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
              CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
            ],
            [SPACE_2_ID]: [
              CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
              CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
            ],
            [DEFAULT_SPACE_ID]: [
              CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
              CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
            ],
          },
          spaceId
        ),
      ].map(testCaseToSuccessResult),
      ...[CONFLICT_1_OBJ, CONFLICT_2A_OBJ, CONFLICT_2B_OBJ, CONFLICT_3_OBJ, CONFLICT_4A_OBJ],
    ],
  },
});

export const createRequest = (testCase: AcrossSpaceExportTestCase) => {
  if (isByIdTestCase(testCase)) {
    return {
      objects: testCase.objects.map(({ type, id, namespace }) => ({ type, id, namespace })),
    };
  } else {
    return {
      type: testCase.types,
      namespaces: testCase.namespaces,
    };
  }
};

const getTestTitle = ({ failure, title }: AcrossSpaceExportTestCase) =>
  `${failure?.reason || 'success'} ["${title}"]`;

export function exportTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectResponseBody = (
    testCase: AcrossSpaceExportTestCase,
    { authorizedAtSpace }: { authorizedAtSpace?: string[] } = {}
  ): ExpectResponseBody => async (response: Record<string, any>) => {
    const { failure } = testCase;

    if (failure) {
      const { reason, statusCode } = failure;
      if (reason === 'forbidden') {
        // blocked by API security
        if (statusCode === 403) {
          expect(response.body).to.eql({
            statusCode: 403,
            error: 'Forbidden',
            message: `Forbidden`,
          });
        } else {
          throw new Error(`Unexpected failure status code: ${failure.statusCode}`);
        }
      } else if (reason === 'bad_request') {
        if (statusCode === 400) {
          expect(response.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: `Bad Request`,
          });
        } else {
          throw new Error(`Unexpected failure status code: ${failure.statusCode}`);
        }
      } else if (reason === 'non_exportable') {
        expect(response.body.error).to.eql('Bad Request');
        expect(response.body.statusCode).to.eql(failure.statusCode);
        if (isByIdTestCase(testCase)) {
          const { type, id } = testCase.objects[0];
          expect(response.body.message).to.eql(
            `Trying to export object(s) with non-exportable types: ${type}:${id}`
          );
        } else {
          const types = testCase.types;
          expect(response.body.message).to.eql(
            `Trying to export non-exportable type(s): ${types.join('')}`
          );
        }
      } else {
        throw new Error(`Unexpected failure reason: ${failure.reason}`);
      }
    } else {
      // 2xx
      let { successResult } = testCase;
      if (!successResult) {
        if (isByIdTestCase(testCase)) {
          successResult = testCase.objects;
        }
      }
      if (!successResult) {
        throw new Error(`no successResult provider for by-type testcase`);
      }

      expect(response.body).not.to.have.property('error');
      const ndjson = response.text.split('\n');
      const savedObjectsArray = Array.isArray(successResult) ? successResult : [successResult!];
      expect(ndjson.length).to.eql(savedObjectsArray.length + 1);
      for (let i = 0; i < ndjson.length - 1; i++) {
        const object = JSON.parse(ndjson[i]);
        const expected = savedObjectsArray.find((x) => x.id === object.id)!;
        expect(expected).not.to.be(undefined);
        expect(object.type).to.eql(expected.type);
        // users without global permission will only see their allowed namespaces
        expect(object.namespaces).to.eql(getExpectedSpaces(expected.namespaces, authorizedAtSpace));
        if (object.originId) {
          expect(object.originId).to.eql(expected.originId);
        }
        expect(object.updated_at).to.match(/^[\d-]{10}T[\d:\.]{12}Z$/);
        // don't test attributes, version, or references
      }
      const exportDetails = JSON.parse(ndjson[ndjson.length - 1]);
      expect(exportDetails).to.eql({
        exportedCount: ndjson.length - 1,
        missingRefCount: 0,
        missingReferences: [],
        excludedObjectsCount: 0,
        excludedObjects: [],
      });
    }
  };

  const getExpectedSpaces = (objectSpaces?: string[], authorizedAtSpace?: string[]) => {
    if (!objectSpaces) {
      return undefined;
    }
    if (!authorizedAtSpace) {
      return objectSpaces;
    }

    const expectedSpaces: string[] = [];
    let missingCount = 0;

    objectSpaces.forEach((space) => {
      if (authorizedAtSpace.includes(space) || space === '*') {
        expectedSpaces.push(space);
      } else {
        missingCount++;
      }
    });
    for (let i = 0; i < missingCount; i++) {
      expectedSpaces.push('?');
    }
    return expectedSpaces;
  };

  const createTestDefinitions = (
    testCases: AcrossSpaceExportTestCase[],
    failure: AcrossSpaceExportTestCase['failure'] | false,
    options?: {
      authorizedAtSpace?: string[];
    }
  ): AcrossSpaceExportTestDefinition[] => {
    if (failure) {
      // override the expected result in each test case
      testCases = testCases.map((x) => ({ ...x, failure }));
    }
    return testCases.map((x) => ({
      title: getTestTitle(x),
      responseStatusCode: x.failure?.statusCode ?? 200,
      request: createRequest(x),
      responseBody: expectResponseBody(x, { authorizedAtSpace: options?.authorizedAtSpace }),
    }));
  };

  const makeExportTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: AcrossSpaceExportTestSuite
  ) => {
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
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_export_across_space`)
            .auth(user?.username, user?.password)
            .send(test.request)
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeExportTest(describe);
  // @ts-ignore
  addTests.only = makeExportTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}
