/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import { expectResponses, getUrlPrefix, getTestTitle } from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite } from '../lib/types';

export interface ResolveImportErrorsTestDefinition extends TestDefinition {
  request: {
    objects: Array<{ type: string; id: string; originId?: string }>;
    retries: Array<{ type: string; id: string; overwrite: boolean; destinationId?: string }>;
  };
  overwrite: boolean;
  createNewCopies: boolean;
}
export type ResolveImportErrorsTestSuite = TestSuite<ResolveImportErrorsTestDefinition>;
export interface ResolveImportErrorsTestCase extends TestCase {
  originId?: string;
  expectedNewId?: string;
  successParam?: string;
  failure?: 400 | 409; // only used for permitted response case
}

const NEW_ATTRIBUTE_KEY = 'title'; // all type mappings include this attribute, for simplicity's sake
const NEW_ATTRIBUTE_VAL = `New attribute value ${Date.now()}`;

// these five saved objects already exist in the sample data:
//  * id: conflict_1
//  * id: conflict_2a, originId: conflict_2
//  * id: conflict_2b, originId: conflict_2
//  * id: conflict_3
//  * id: conflict_4a, originId: conflict_4
// using the five conflict test case objects below, we can exercise various permutations of exact/inexact/ambiguous conflict scenarios
export const TEST_CASES = Object.freeze({
  ...CASES,
  CONFLICT_1A_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_1a`,
    originId: `conflict_1`,
    expectedNewId: 'some-random-id',
  }),
  CONFLICT_1B_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_1b`,
    originId: `conflict_1`,
    expectedNewId: 'another-random-id',
  }),
  CONFLICT_2C_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_2c`,
    originId: `conflict_2`,
    expectedNewId: `conflict_2a`,
  }),
  CONFLICT_3A_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_3a`,
    originId: `conflict_3`,
    expectedNewId: `conflict_3`,
  }),
  CONFLICT_4_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_4`,
    expectedNewId: `conflict_4a`,
  }),
});

/**
 * Test cases have additional properties that we don't want to send in HTTP Requests
 */
const createRequest = (
  { type, id, originId, expectedNewId, successParam }: ResolveImportErrorsTestCase,
  overwrite: boolean
): ResolveImportErrorsTestDefinition['request'] => ({
  objects: [{ type, id, ...(originId && { originId }) }],
  retries: [
    {
      type,
      id,
      overwrite,
      ...(expectedNewId && { destinationId: expectedNewId }),
      ...(successParam === 'createNewCopy' && { createNewCopy: true }),
    },
  ],
});

export function resolveImportErrorsTestSuiteFactory(
  es: any,
  esArchiver: any,
  supertest: SuperTest<any>
) {
  const expectForbidden = expectResponses.forbiddenTypes('bulk_create');
  const expectResponseBody = (
    testCases: ResolveImportErrorsTestCase | ResolveImportErrorsTestCase[],
    statusCode: 200 | 403,
    singleRequest: boolean,
    overwrite: boolean,
    createNewCopies: boolean,
    spaceId = SPACES.DEFAULT.spaceId
  ): ExpectResponseBody => async (response: Record<string, any>) => {
    const testCaseArray = Array.isArray(testCases) ? testCases : [testCases];
    if (statusCode === 403) {
      const types = testCaseArray.map((x) => x.type);
      await expectForbidden(types)(response);
    } else {
      // permitted
      const { success, successCount, successResults, errors } = response.body;
      const expectedSuccesses = testCaseArray.filter((x) => !x.failure);
      const expectedFailures = testCaseArray.filter((x) => x.failure);
      expect(success).to.eql(expectedFailures.length === 0);
      expect(successCount).to.eql(expectedSuccesses.length);
      if (expectedFailures.length) {
        expect(errors).to.have.length(expectedFailures.length);
      } else {
        expect(response.body).not.to.have.property('errors');
      }
      for (let i = 0; i < expectedSuccesses.length; i++) {
        const { type, id, successParam, expectedNewId } = expectedSuccesses[i];
        // we don't know the order of the returned successResults; search for each one
        const object = (successResults as Array<Record<string, unknown>>).find(
          (x) => x.type === type && x.id === id
        );
        expect(object).not.to.be(undefined);
        const destinationId = object!.destinationId as string;
        if (successParam === 'destinationId') {
          // Kibana created the object with a different ID than what was specified in the import
          // This can happen due to an unresolvable conflict (so the new ID will be random), or due to an inexact match (so the new ID will
          // be equal to the ID or originID of the existing object that it inexactly matched)
          if (expectedNewId) {
            expect(destinationId).to.be(expectedNewId);
          } else {
            // the new ID was randomly generated
            expect(destinationId).to.match(/^[0-9a-f-]{36}$/);
          }
        } else if (successParam === 'createNewCopies' || successParam === 'createNewCopy') {
          expect(destinationId).to.be(expectedNewId!);
        } else {
          expect(destinationId).to.be(undefined);
        }

        // This assertion is only needed for the case where `createNewCopies` mode is disabled and ambiguous source conflicts are detected.
        // When `createNewCopies` mode is permanently enabled, this field will be removed, and this assertion will be redundant and can be
        // removed too.
        const createNewCopy = object!.createNewCopy as boolean | undefined;
        if (successParam === 'createNewCopy') {
          expect(createNewCopy).to.be(true);
        } else {
          expect(createNewCopy).to.be(undefined);
        }

        if (!singleRequest || overwrite || createNewCopies) {
          const { _source } = await expectResponses.successCreated(
            es,
            spaceId,
            type,
            destinationId ?? id
          );
          expect(_source[type][NEW_ATTRIBUTE_KEY]).to.eql(NEW_ATTRIBUTE_VAL);
        }
      }
      for (let i = 0; i < expectedFailures.length; i++) {
        const { type, id, failure, expectedNewId } = expectedFailures[i];
        // we don't know the order of the returned errors; search for each one
        const object = (errors as Array<Record<string, unknown>>).find(
          (x) => x.type === type && x.id === id
        );
        expect(object).not.to.be(undefined);
        if (failure === 400) {
          expect(object!.error).to.eql({ type: 'unsupported_type' });
        } else {
          // 409
          expect(object!.error).to.eql({
            type: 'conflict',
            ...(expectedNewId && { destinationId: expectedNewId }),
          });
        }
      }
    }
  };
  const createTestDefinitions = (
    testCases: ResolveImportErrorsTestCase | ResolveImportErrorsTestCase[],
    forbidden: boolean,
    options: {
      overwrite?: boolean;
      createNewCopies?: boolean;
      spaceId?: string;
      singleRequest?: boolean;
      responseBodyOverride?: ExpectResponseBody;
    }
  ): ResolveImportErrorsTestDefinition[] => {
    const cases = Array.isArray(testCases) ? testCases : [testCases];
    const responseStatusCode = forbidden ? 403 : 200;
    const {
      overwrite = false,
      createNewCopies = false,
      spaceId,
      singleRequest,
      responseBodyOverride,
    } = options;
    if (!singleRequest) {
      // if we are testing cases that should result in a forbidden response, we can do each case individually
      // this ensures that multiple test cases of a single type will each result in a forbidden error
      return cases.map((x) => ({
        title: getTestTitle(x, responseStatusCode),
        request: createRequest(x, overwrite),
        responseStatusCode,
        responseBody:
          responseBodyOverride ||
          expectResponseBody(x, responseStatusCode, false, overwrite, createNewCopies, spaceId),
        overwrite,
        createNewCopies,
      }));
    }
    // batch into a single request to save time during test execution
    return [
      {
        title: getTestTitle(cases, responseStatusCode),
        request: cases
          .map((x) => createRequest(x, overwrite))
          .reduce((acc, cur) => ({
            objects: [...acc.objects, ...cur.objects],
            retries: [...acc.retries, ...cur.retries],
          })),
        responseStatusCode,
        responseBody:
          responseBodyOverride ||
          expectResponseBody(cases, responseStatusCode, true, overwrite, createNewCopies, spaceId),
        overwrite,
        createNewCopies,
      },
    ];
  };

  const makeResolveImportErrorsTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: ResolveImportErrorsTestSuite
  ) => {
    const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      const attrs = { attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL } };

      for (const test of tests) {
        it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
          const requestBody = test.request.objects
            .map((obj) => JSON.stringify({ ...obj, ...attrs }))
            .join('\n');
          const query = test.createNewCopies ? '?createNewCopies=true' : '';
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_resolve_import_errors${query}`)
            .auth(user?.username, user?.password)
            .field('retries', JSON.stringify(test.request.retries))
            .attach('file', Buffer.from(requestBody, 'utf8'), 'export.ndjson')
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeResolveImportErrorsTest(describe);
  // @ts-ignore
  addTests.only = makeResolveImportErrorsTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
    expectForbidden,
  };
}
