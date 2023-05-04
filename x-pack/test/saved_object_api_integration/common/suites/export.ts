/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import {
  SAVED_OBJECT_TEST_CASES,
  CONFLICT_TEST_CASES,
  OTHER_TEST_CASES,
} from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import { expectResponses, getUrlPrefix } from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestDefinition, TestSuite } from '../lib/types';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

export interface ExportTestDefinition extends TestDefinition {
  request: ReturnType<typeof createRequest>;
}

export type ExportTestSuite = TestSuite<ExportTestDefinition>;

interface SuccessResult {
  type: string;
  id: string;
  originId?: string;
}

export interface ExportTestCase {
  title: string;
  type: string;
  id?: string;
  successResult?: SuccessResult | SuccessResult[];
  failure?: {
    statusCode: 200 | 400 | 403; // if the user searches for only types they are not authorized for, they will get an empty 200 result
    reason: 'unauthorized' | 'bad_request';
  };
}

const CASES = {
  ...SAVED_OBJECT_TEST_CASES,
  ...CONFLICT_TEST_CASES,
  ...OTHER_TEST_CASES,
};

export const getTestCases = (spaceId?: string): { [key: string]: ExportTestCase } => ({
  singleNamespaceObject: {
    title: 'single-namespace object',
    ...(spaceId === SPACE_1_ID
      ? CASES.SINGLE_NAMESPACE_SPACE_1
      : spaceId === SPACE_2_ID
      ? CASES.SINGLE_NAMESPACE_SPACE_2
      : CASES.SINGLE_NAMESPACE_DEFAULT_SPACE),
  },
  singleNamespaceType: {
    // this test explicitly ensures that single-namespace objects from other spaces are not returned
    title: 'single-namespace type',
    type: 'isolatedtype',
    successResult:
      spaceId === SPACE_1_ID
        ? CASES.SINGLE_NAMESPACE_SPACE_1
        : spaceId === SPACE_2_ID
        ? CASES.SINGLE_NAMESPACE_SPACE_2
        : CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
  },
  multiNamespaceObject: {
    title: 'multi-namespace object',
    ...(spaceId === SPACE_1_ID
      ? CASES.MULTI_NAMESPACE_ONLY_SPACE_1
      : spaceId === SPACE_2_ID
      ? CASES.MULTI_NAMESPACE_ONLY_SPACE_2
      : CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1),
  },
  multiNamespaceType: {
    title: 'multi-namespace type',
    type: 'sharedtype',
    successResult: [
      CASES.MULTI_NAMESPACE_ALL_SPACES,
      ...(spaceId === SPACE_1_ID
        ? [CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, CASES.MULTI_NAMESPACE_ONLY_SPACE_1]
        : spaceId === SPACE_2_ID
        ? [CASES.MULTI_NAMESPACE_ONLY_SPACE_2]
        : [CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1]),
      ...[
        CASES.CONFLICT_1_OBJ,
        CASES.CONFLICT_2A_OBJ,
        CASES.CONFLICT_2B_OBJ,
        CASES.CONFLICT_3_OBJ,
        CASES.CONFLICT_4A_OBJ,
        CASES.OUTBOUND_MISSING_REFERENCE_CONFLICT_1_OBJ,
        CASES.OUTBOUND_MISSING_REFERENCE_CONFLICT_2A_OBJ,
      ],
    ],
  },
  ...(spaceId !== SPACE_2_ID && {
    // we do not have a multi-namespace isolated object in Space 2
    multiNamespaceIsolatedObject: {
      title: 'multi-namespace isolated object',
      ...(spaceId === SPACE_1_ID
        ? CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1
        : CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE),
    },
  }),
  multiNamespaceIsolatedType: {
    title: 'multi-namespace isolated type',
    type: 'sharecapabletype',
    successResult: [
      ...(spaceId === SPACE_1_ID
        ? [CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1]
        : spaceId === SPACE_2_ID
        ? []
        : [CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE]
      ).flat(),
    ],
  },
  namespaceAgnosticObject: {
    title: 'namespace-agnostic object',
    ...CASES.NAMESPACE_AGNOSTIC,
  },
  namespaceAgnosticType: {
    title: 'namespace-agnostic type',
    type: 'globaltype',
    successResult: CASES.NAMESPACE_AGNOSTIC,
  },
  hiddenObject: {
    title: 'hidden object',
    ...CASES.HIDDEN,
    failure: { statusCode: 400, reason: 'bad_request' },
  },
  hiddenType: {
    title: 'hidden type',
    type: 'hiddentype',
    failure: { statusCode: 400, reason: 'bad_request' },
  },
});
export const createRequest = ({ type, id }: ExportTestCase) =>
  id ? { objects: [{ type, id }] } : { type };
const getTestTitle = ({ failure, title }: ExportTestCase) =>
  `${failure?.reason || 'success'} ["${title}"]`;

const EMPTY_RESULT = {
  excludedObjects: [],
  excludedObjectsCount: 0,
  exportedCount: 0,
  missingRefCount: 0,
  missingReferences: [],
};

export function exportTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectSavedObjectForbiddenBulkGet = expectResponses.forbiddenTypes('bulk_get');
  const expectResponseBody =
    (testCase: ExportTestCase): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      const { type, id, successResult = { type, id } as SuccessResult, failure } = testCase;
      if (failure?.reason === 'unauthorized') {
        // In export only, the API uses "bulkGet" or "find" depending on the parameters it receives.
        if (failure.statusCode === 403) {
          if (id) {
            // "bulkGet" was unauthorized, which returns a forbidden error
            await expectSavedObjectForbiddenBulkGet(type)(response);
          } else {
            expect(response.body).to.eql({
              statusCode: 403,
              error: 'Forbidden',
              message: `unauthorized`,
            });
          }
        } else if (failure.statusCode === 200) {
          // "find" was unauthorized, which returns an empty result
          expect(response.body).not.to.have.property('error');
          expect(response.text).to.equal(JSON.stringify(EMPTY_RESULT));
        } else {
          throw new Error(`Unexpected failure status code: ${failure.statusCode}`);
        }
      } else if (failure?.reason === 'bad_request') {
        expect(response.body.error).to.eql('Bad Request');
        expect(response.body.statusCode).to.eql(failure.statusCode);
        if (id) {
          expect(response.body.message).to.eql(
            `Trying to export object(s) with non-exportable types: ${type}:${id}`
          );
        } else {
          expect(response.body.message).to.eql(`Trying to export non-exportable type(s): ${type}`);
        }
      } else if (failure?.reason) {
        throw new Error(`Unexpected failure reason: ${failure.reason}`);
      } else {
        // 2xx
        expect(response.body).not.to.have.property('error');
        const ndjson = response.text.split('\n');
        const savedObjectsArray = Array.isArray(successResult) ? successResult : [successResult];
        expect(ndjson.length).to.eql(savedObjectsArray.length + 1);
        for (let i = 0; i < ndjson.length - 1; i++) {
          const object = JSON.parse(ndjson[i]);
          const expected = savedObjectsArray.find((x) => x.id === object.id)!;
          expect(expected).not.to.be(undefined);
          expect(object.type).to.eql(expected.type);
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
  const createTestDefinitions = (
    testCases: ExportTestCase | ExportTestCase[],
    failure: ExportTestCase['failure'] | false,
    options?: {
      responseBodyOverride?: ExpectResponseBody;
    }
  ): ExportTestDefinition[] => {
    let cases = Array.isArray(testCases) ? testCases : [testCases];
    if (failure) {
      // override the expected result in each test case
      cases = cases.map((x) => ({ ...x, failure }));
    }
    return cases.map((x) => ({
      title: getTestTitle(x),
      responseStatusCode: x.failure?.statusCode ?? 200,
      request: createRequest(x),
      responseBody: options?.responseBodyOverride || expectResponseBody(x),
    }));
  };

  const makeExportTest =
    (describeFn: Mocha.SuiteFunction) => (description: string, definition: ExportTestSuite) => {
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
              .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_export`)
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
