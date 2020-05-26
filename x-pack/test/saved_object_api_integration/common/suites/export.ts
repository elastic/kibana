/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
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
  failure?: 400 | 403;
}

// additional sharedtype objects that exist but do not have common test cases defined
const CID = 'conflict_';
const CONFLICT_1_OBJ = Object.freeze({ type: 'sharedtype', id: `${CID}1` });
const CONFLICT_2A_OBJ = Object.freeze({ type: 'sharedtype', id: `${CID}2a`, originId: `${CID}2` });
const CONFLICT_2B_OBJ = Object.freeze({ type: 'sharedtype', id: `${CID}2b`, originId: `${CID}2` });
const CONFLICT_3_OBJ = Object.freeze({ type: 'sharedtype', id: `${CID}3` });
const CONFLICT_4A_OBJ = Object.freeze({ type: 'sharedtype', id: `${CID}4a`, originId: `${CID}4` });

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
    successResult: (spaceId === SPACE_1_ID
      ? [CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, CASES.MULTI_NAMESPACE_ONLY_SPACE_1]
      : spaceId === SPACE_2_ID
      ? [CASES.MULTI_NAMESPACE_ONLY_SPACE_2]
      : [CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1]
    )
      .concat([CONFLICT_1_OBJ, CONFLICT_2A_OBJ, CONFLICT_2B_OBJ, CONFLICT_3_OBJ, CONFLICT_4A_OBJ])
      .flat(),
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
  hiddenObject: { title: 'hidden object', ...CASES.HIDDEN, failure: 400 },
  hiddenType: { title: 'hidden type', type: 'hiddentype', failure: 400 },
});
export const createRequest = ({ type, id }: ExportTestCase) =>
  id ? { objects: [{ type, id }] } : { type };
const getTestTitle = ({ failure, title }: ExportTestCase) => {
  let description = 'success';
  if (failure === 400) {
    description = 'bad request';
  } else if (failure === 403) {
    description = 'forbidden';
  }
  return `${description} ["${title}"]`;
};

export function exportTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectForbiddenBulkGet = expectResponses.forbidden('bulk_get');
  const expectForbiddenFind = expectResponses.forbidden('find');
  const expectResponseBody = (testCase: ExportTestCase): ExpectResponseBody => async (
    response: Record<string, any>
  ) => {
    const { type, id, successResult = { type, id } as SuccessResult, failure } = testCase;
    if (failure === 403) {
      // In export only, the API uses "bulk_get" or "find" depending on the parameters it receives.
      // The best that could be done here is to have an if statement to ensure at least one of the
      // two errors has been thrown.
      if (id) {
        await expectForbiddenBulkGet(type)(response);
      } else {
        await expectForbiddenFind(type)(response);
      }
    } else if (failure === 400) {
      // 400
      expect(response.body.error).to.eql('Bad Request');
      expect(response.body.statusCode).to.eql(failure);
      if (id) {
        expect(response.body.message).to.eql(
          `Trying to export object(s) with non-exportable types: ${type}:${id}`
        );
      } else {
        expect(response.body.message).to.eql(`Trying to export non-exportable type(s): ${type}`);
      }
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
      });
    }
  };
  const createTestDefinitions = (
    testCases: ExportTestCase | ExportTestCase[],
    forbidden: boolean,
    options?: {
      responseBodyOverride?: ExpectResponseBody;
    }
  ): ExportTestDefinition[] => {
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

  const makeExportTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: ExportTestSuite
  ) => {
    const { user, spaceId = DEFAULT_SPACE_ID, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

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
