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
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite } from '../lib/types';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

export interface ExportTestDefinition extends TestDefinition {
  request: ReturnType<typeof createRequest>;
}
export type ExportTestSuite = TestSuite<ExportTestDefinition>;
export interface ExportTestCase {
  title: string;
  type: string;
  id?: string;
  successResult?: TestCase | TestCase[];
  failure?: 400 | 403;
}

export const getTestCases = (spaceId?: string) => ({
  singleNamespaceObject: {
    title: 'single-namespace object',
    ...(spaceId === SPACE_1_ID
      ? CASES.SINGLE_NAMESPACE_SPACE_1
      : spaceId === SPACE_2_ID
      ? CASES.SINGLE_NAMESPACE_SPACE_2
      : CASES.SINGLE_NAMESPACE_DEFAULT_SPACE),
  } as ExportTestCase,
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
  } as ExportTestCase,
  multiNamespaceObject: {
    title: 'multi-namespace object',
    ...(spaceId === SPACE_1_ID
      ? CASES.MULTI_NAMESPACE_ONLY_SPACE_1
      : spaceId === SPACE_2_ID
      ? CASES.MULTI_NAMESPACE_ONLY_SPACE_2
      : CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1),
    failure: 400, // multi-namespace types cannot be exported yet
  } as ExportTestCase,
  multiNamespaceType: {
    title: 'multi-namespace type',
    type: 'sharedtype',
    // successResult:
    //   spaceId === SPACE_1_ID
    //     ? [CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, CASES.MULTI_NAMESPACE_ONLY_SPACE_1]
    //     : spaceId === SPACE_2_ID
    //     ? CASES.MULTI_NAMESPACE_ONLY_SPACE_2
    //     : CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
    failure: 400, // multi-namespace types cannot be exported yet
  } as ExportTestCase,
  namespaceAgnosticObject: {
    title: 'namespace-agnostic object',
    ...CASES.NAMESPACE_AGNOSTIC,
  } as ExportTestCase,
  namespaceAgnosticType: {
    title: 'namespace-agnostic type',
    type: 'globaltype',
    successResult: CASES.NAMESPACE_AGNOSTIC,
  } as ExportTestCase,
  hiddenObject: { title: 'hidden object', ...CASES.HIDDEN, failure: 400 } as ExportTestCase,
  hiddenType: { title: 'hidden type', type: 'hiddentype', failure: 400 } as ExportTestCase,
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
  const expectForbiddenBulkGet = expectResponses.forbiddenTypes('bulk_get');
  const expectForbiddenFind = expectResponses.forbiddenTypes('find');
  const expectResponseBody = (testCase: ExportTestCase): ExpectResponseBody => async (
    response: Record<string, any>
  ) => {
    const { type, id, successResult = { type, id }, failure } = testCase;
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
      for (let i = 0; i < savedObjectsArray.length; i++) {
        const object = JSON.parse(ndjson[i]);
        const { type: expectedType, id: expectedId } = savedObjectsArray[i];
        expect(object.type).to.eql(expectedType);
        expect(object.id).to.eql(expectedId);
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
