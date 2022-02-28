/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import type { SavedObjectReference, SavedObjectsImportRetry } from 'src/core/server';
import { SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { SPACES } from '../lib/spaces';
import { expectResponses, getUrlPrefix, getTestTitle } from '../lib/saved_object_test_utils';
import { ExpectResponseBody, TestCase, TestDefinition, TestSuite } from '../lib/types';

export interface ResolveImportErrorsTestDefinition extends TestDefinition {
  request: {
    objects: Array<{
      type: string;
      id: string;
      originId?: string;
      references?: SavedObjectReference[];
    }>;
    retries: Array<{
      type: string;
      id: string;
      overwrite: boolean;
      destinationId?: string;
      replaceReferences?: SavedObjectsImportRetry['replaceReferences'];
    }>;
  };
  overwrite: boolean;
  createNewCopies: boolean;
}
export type ResolveImportErrorsTestSuite = TestSuite<ResolveImportErrorsTestDefinition>;
export type FailureType = 'unsupported_type' | 'conflict';
export interface ResolveImportErrorsTestCase extends Omit<TestCase, 'failure'> {
  originId?: string;
  destinationId?: string;
  expectedNewId?: string;
  references?: SavedObjectReference[];
  replaceReferences?: SavedObjectsImportRetry['replaceReferences'];
  successParam?: string;
  failureType?: FailureType; // only used for permitted response case
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
const { HIDDEN, ...REMAINING_CASES } = CASES;
export const TEST_CASES: Record<string, ResolveImportErrorsTestCase> = Object.freeze({
  ...REMAINING_CASES,
  CONFLICT_1A_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_1a`,
    originId: `conflict_1`,
    destinationId: 'some-random-id',
    expectedNewId: 'some-random-id',
  }),
  CONFLICT_1B_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_1b`,
    originId: `conflict_1`,
    destinationId: 'another-random-id',
    expectedNewId: 'another-random-id',
  }),
  CONFLICT_2C_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_2c`,
    originId: `conflict_2`,
    destinationId: `conflict_2a`,
    expectedNewId: `conflict_2a`,
  }),
  CONFLICT_2D_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_2d`,
    originId: `conflict_2`,
    // destinationId is undefined on purpose
    expectedNewId: `conflict_2b`, // since conflict_2c was matched with conflict_2a, this (conflict_2d) will result in a regular inexact match conflict with conflict_2b
  }),
  CONFLICT_3A_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_3a`,
    originId: `conflict_3`,
    destinationId: `conflict_3`,
    expectedNewId: `conflict_3`,
  }),
  CONFLICT_4_OBJ: Object.freeze({
    type: 'sharedtype',
    id: `conflict_4`,
    destinationId: `conflict_4a`,
    expectedNewId: `conflict_4a`,
  }),
});
export const SPECIAL_TEST_CASES: Record<string, ResolveImportErrorsTestCase> = Object.freeze({
  HIDDEN,
  OUTBOUND_MISSING_REFERENCE_CONFLICT_1_OBJ: Object.freeze({
    // This object has an exact match that already exists, *and* it has a reference to an index pattern that doesn't exist.
    // We are choosing to replace the reference here, so Kibana should detect if there is a conflict and respond appropriately.
    type: 'sharedtype',
    id: 'outbound-missing-reference-conflict-1',
    references: [{ name: '1', type: 'index-pattern', id: 'missing' }],
    replaceReferences: [
      {
        type: 'index-pattern',
        from: 'missing',
        to: 'inbound-reference-origin-match-2b', // specific ID doesn't matter, just needs to be an index pattern that exists in all spaces
      },
    ],
  }),
  OUTBOUND_MISSING_REFERENCE_CONFLICT_2_OBJ: Object.freeze({
    // This object has an inexact match that already exists, *and* it has a reference to an index pattern that doesn't exist.
    // We are choosing to replace the reference here, so Kibana should detect if there is a conflict and respond appropriately.
    type: 'sharedtype',
    id: 'outbound-missing-reference-conflict-2',
    expectedNewId: `outbound-missing-reference-conflict-2a`,
    references: [{ name: '1', type: 'index-pattern', id: 'missing' }],
    replaceReferences: [
      {
        type: 'index-pattern',
        from: 'missing',
        to: 'inbound-reference-origin-match-2b', // specific ID doesn't matter, just needs to be an index pattern that exists in all spaces
      },
    ],
  }),
  OUTBOUND_REFERENCE_ORIGIN_MATCH_1_OBJ: Object.freeze({
    // This object does not already exist, but it has a reference to the originId of an index pattern that does exist.
    // We use index patterns because they are one of the few reference types that are validated, so the import will fail if the reference
    // is broken.
    // This import is designed to succeed because there is exactly one origin match for its reference, and that reference will be changed to
    // match the index pattern's new ID.
    type: 'sharedtype',
    id: 'outbound-reference-origin-match-1',
    references: [{ name: '1', type: 'index-pattern', id: 'inbound-reference-origin-match-1' }],
  }),
  OUTBOUND_REFERENCE_ORIGIN_MATCH_2_OBJ: Object.freeze({
    // This object does not already exist, but it has a reference to the originId of two index patterns that do exist.
    // This import would normally fail because there are two origin matches for its reference, and we can't currently handle ambiguous
    // destinations for reference origin matches.
    // However, when retrying we can specify which reference(s) should be replaced.
    type: 'sharedtype',
    id: 'outbound-reference-origin-match-2',
    references: [{ name: '1', type: 'index-pattern', id: 'inbound-reference-origin-match-2' }],
    replaceReferences: [
      {
        type: 'index-pattern',
        from: 'inbound-reference-origin-match-2',
        to: 'inbound-reference-origin-match-2a',
      },
    ],
  }),
});

/**
 * Test cases have additional properties that we don't want to send in HTTP Requests
 */
const createRequest = (
  {
    type,
    id,
    originId,
    destinationId,
    references,
    replaceReferences,
    successParam,
  }: ResolveImportErrorsTestCase,
  overwrite: boolean
): ResolveImportErrorsTestDefinition['request'] => ({
  objects: [{ type, id, ...(originId && { originId }), ...(references && { references }) }],
  retries: [
    {
      type,
      id,
      overwrite,
      ...(destinationId && { destinationId }),
      ...(replaceReferences && { replaceReferences }),
      ...(successParam === 'createNewCopy' && { createNewCopy: true }),
    },
  ],
});

export const resolveImportErrorsTestCaseFailures = {
  failUnsupportedType: (condition?: boolean): { failureType?: 'unsupported_type' } =>
    condition !== false ? { failureType: 'unsupported_type' } : {},
  failConflict: (condition?: boolean): { failureType?: 'conflict' } =>
    condition !== false ? { failureType: 'conflict' } : {},
};

export function resolveImportErrorsTestSuiteFactory(
  es: Client,
  esArchiver: any,
  supertest: SuperTest<any>
) {
  const expectSavedObjectForbidden = (action: string, typeOrTypes: string | string[]) =>
    expectResponses.forbiddenTypes(action)(typeOrTypes);
  const expectResponseBody =
    (
      testCases: ResolveImportErrorsTestCase | ResolveImportErrorsTestCase[],
      statusCode: 200 | 403,
      singleRequest: boolean,
      overwrite: boolean,
      createNewCopies: boolean,
      spaceId = SPACES.DEFAULT.spaceId
    ): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      const testCaseArray = Array.isArray(testCases) ? testCases : [testCases];
      if (statusCode === 403) {
        const types = testCaseArray.map((x) => x.type);
        await expectSavedObjectForbidden('bulk_create', types)(response);
      } else {
        // permitted
        const { success, successCount, successResults, errors } = response.body;
        const expectedSuccesses = testCaseArray.filter((x) => !x.failureType);
        const expectedFailures = testCaseArray.filter((x) => x.failureType);
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
            expect(_source?.[type][NEW_ATTRIBUTE_KEY]).to.eql(NEW_ATTRIBUTE_VAL);
          }
        }
        for (let i = 0; i < expectedFailures.length; i++) {
          const { type, id, failureType, expectedNewId } = expectedFailures[i];
          // we don't know the order of the returned errors; search for each one
          const object = (errors as Array<Record<string, unknown>>).find(
            (x) => x.type === type && x.id === id
          );
          expect(object).not.to.be(undefined);
          const expectedError: Record<string, unknown> = { type: failureType };
          switch (failureType!) {
            case 'unsupported_type':
              break;
            case 'conflict':
              if (expectedNewId) {
                expectedError.destinationId = expectedNewId;
              }
              break;
          }
          expect(object!.error).to.eql(expectedError);
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

  const makeResolveImportErrorsTest =
    (describeFn: Mocha.SuiteFunction) =>
    (description: string, definition: ResolveImportErrorsTestSuite) => {
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
    expectSavedObjectForbidden,
  };
}
