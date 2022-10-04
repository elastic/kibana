/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import {
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportFailure,
} from '../../../../../src/core/public/saved_objects';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';
import { CopyResponse } from '../../../../plugins/spaces/server/lib/copy_to_spaces';
import { getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';
import { getTestDataLoader, SPACE_1, SPACE_2 } from '../../../common/lib/test_data_loader';
import type { FtrProviderContext } from '../ftr_provider_context';

type TestResponse = Record<string, any>;

interface CopyToSpaceTest {
  statusCode: number;
  response: (resp: TestResponse) => Promise<void>;
}

interface CopyToSpaceMultiNamespaceTest extends CopyToSpaceTest {
  testTitle: string;
  objects: Array<Record<string, any>>;
}

interface CopyToSpaceTests {
  noConflictsWithoutReferences: CopyToSpaceTest;
  noConflictsWithReferences: CopyToSpaceTest;
  withConflictsOverwriting: CopyToSpaceTest;
  withConflictsWithoutOverwriting: CopyToSpaceTest;
  nonExistentSpace: CopyToSpaceTest;
  multipleSpaces: {
    statusCode: number;
    withConflictsResponse: (resp: TestResponse) => Promise<void>;
    noConflictsResponse: (resp: TestResponse) => Promise<void>;
  };
  multiNamespaceTestCases: (
    overwrite: boolean,
    createNewCopies: boolean
  ) => CopyToSpaceMultiNamespaceTest[];
}

interface CopyToSpaceTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: CopyToSpaceTests;
}

interface CountByTypeBucket {
  key: string;
  doc_count: number;
}
interface SpaceBucket {
  doc_count: number;
  key: string;
  countByType: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: CountByTypeBucket[];
  };
}

const INITIAL_COUNTS: Record<string, Record<string, number>> = {
  [DEFAULT_SPACE_ID]: { dashboard: 2, visualization: 3, 'index-pattern': 1 },
  space_1: { dashboard: 2, visualization: 3, 'index-pattern': 1 },
  space_2: { dashboard: 1 },
};

const SPACE_DATA_TO_LOAD: Array<{ spaceName: string | null; dataUrl: string }> = [
  {
    spaceName: null,
    dataUrl: 'x-pack/test/spaces_api_integration/common/fixtures/kbn_archiver/default_space.json',
  },
  {
    spaceName: SPACE_1.id,
    dataUrl: 'x-pack/test/spaces_api_integration/common/fixtures/kbn_archiver/space_1.json',
  },
  {
    spaceName: SPACE_2.id,
    dataUrl: 'x-pack/test/spaces_api_integration/common/fixtures/kbn_archiver/space_2.json',
  },
];

const getDestinationWithoutConflicts = () => 'space_2';
const getDestinationWithConflicts = (originSpaceId?: string) =>
  !originSpaceId || originSpaceId === DEFAULT_SPACE_ID ? 'space_1' : DEFAULT_SPACE_ID;

export function copyToSpaceTestSuiteFactory(context: FtrProviderContext) {
  const testDataLoader = getTestDataLoader(context);
  const supertestWithoutAuth = context.getService('supertestWithoutAuth');
  const es = context.getService('es');

  const collectSpaceContents = async () => {
    const { body: response } = await es.search({
      index: '.kibana',
      body: {
        size: 0,
        query: { terms: { type: ['visualization', 'dashboard', 'index-pattern'] } },
        aggs: {
          count: {
            terms: { field: 'namespace', missing: DEFAULT_SPACE_ID, size: 10 },
            aggs: { countByType: { terms: { field: 'type', missing: 'UNKNOWN', size: 10 } } },
          },
        },
      },
    });

    const aggs = response.aggregations as Record<
      string,
      estypes.AggregationsMultiBucketAggregate<SpaceBucket>
    >;
    return {
      buckets: aggs.count.buckets,
    };
  };

  const assertSpaceCounts = async (
    spaceId: string,
    expectedCounts: Record<string, number> = {}
  ) => {
    const bucketSorter = (b1: CountByTypeBucket, b2: CountByTypeBucket) =>
      b1.key < b2.key ? -1 : 1;
    const { buckets } = await collectSpaceContents();

    const spaceBucket = buckets.find((b) => b.key === spaceId);

    if (!spaceBucket) {
      expect(Object.keys(expectedCounts).length).to.eql(0);
      return;
    }

    const { countByType } = spaceBucket;
    const expectedBuckets = Object.entries(expectedCounts).reduce((acc, entry) => {
      const [type, count] = entry;
      return [...acc, { key: type, doc_count: count }];
    }, [] as CountByTypeBucket[]);

    expectedBuckets.sort(bucketSorter);
    countByType.buckets.sort(bucketSorter);

    expect(countByType).to.eql({
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: expectedBuckets,
    });
  };

  const expectRouteForbiddenResponse = async (resp: TestResponse) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Forbidden',
    });
  };

  const expectRouteNotFoundResponse = async (resp: TestResponse) => {
    expect(resp.body).to.eql({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  };

  const createExpectNoConflictsWithoutReferencesForSpace =
    (spaceId: string, destination: string, expectedDashboardCount: number) =>
    async (resp: TestResponse) => {
      const result = resp.body as CopyResponse;
      expect(result).to.eql({
        [destination]: {
          success: true,
          successCount: 1,
          successResults: [
            {
              id: 'cts_dashboard',
              type: 'dashboard',
              meta: {
                title: `This is the ${spaceId} test space CTS dashboard`,
                icon: 'dashboardApp',
              },
            },
          ],
        },
      } as CopyResponse);

      // Query ES to ensure that we copied everything we expected
      await assertSpaceCounts(destination, {
        dashboard: expectedDashboardCount,
      });
    };

  const expectNoConflictsWithoutReferencesResult = (spaceId: string = DEFAULT_SPACE_ID) =>
    createExpectNoConflictsWithoutReferencesForSpace(spaceId, getDestinationWithoutConflicts(), 2);

  const expectNoConflictsForNonExistentSpaceResult = (spaceId: string = DEFAULT_SPACE_ID) =>
    createExpectNoConflictsWithoutReferencesForSpace(spaceId, 'non_existent_space', 1);

  const expectNoConflictsWithReferencesResult =
    (spaceId: string = DEFAULT_SPACE_ID) =>
    async (resp: TestResponse) => {
      const destination = getDestinationWithoutConflicts();
      const result = resp.body as CopyResponse;
      expect(result).to.eql({
        [destination]: {
          success: true,
          successCount: 5,
          successResults: [
            {
              id: 'cts_ip_1',
              type: 'index-pattern',
              meta: {
                icon: 'indexPatternApp',
                title: `Copy to Space index pattern 1 from ${spaceId} space`,
              },
            },
            {
              id: `cts_vis_1_${spaceId}`,
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 1 from ${spaceId} space` },
            },
            {
              id: `cts_vis_2_${spaceId}`,
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 2 from ${spaceId} space` },
            },
            {
              id: 'cts_vis_3',
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 3 from ${spaceId} space` },
            },
            {
              id: 'cts_dashboard',
              type: 'dashboard',
              meta: {
                icon: 'dashboardApp',
                title: `This is the ${spaceId} test space CTS dashboard`,
              },
            },
          ],
        },
      } as CopyResponse);

      // Query ES to ensure that we copied everything we expected
      await assertSpaceCounts(destination, {
        dashboard: 2,
        visualization: 3,
        'index-pattern': 1,
      });
    };

  const getDestinationSpace = (
    sourceSpaceId: string,
    type: 'with-conflicts' | 'without-conflicts' | 'non-existent'
  ) => {
    if (type === 'non-existent') {
      return 'non_existent_space';
    }

    return type === 'with-conflicts'
      ? getDestinationWithConflicts(sourceSpaceId)
      : getDestinationWithoutConflicts();
  };

  const createExpectUnauthorizedAtSpaceWithReferencesResult =
    (spaceId: string = DEFAULT_SPACE_ID, type: 'with-conflicts' | 'without-conflicts') =>
    async (resp: TestResponse) => {
      const destination = getDestinationSpace(spaceId, type);

      const result = resp.body as CopyResponse;
      expect(result).to.eql({
        [destination]: {
          success: false,
          successCount: 0,
          errors: [
            {
              statusCode: 403,
              error: 'Forbidden',
              message: 'Unable to bulk_create dashboard,index-pattern,visualization',
            },
          ],
        },
      } as CopyResponse);

      // Query ES to ensure that nothing was copied
      await assertSpaceCounts(destination, INITIAL_COUNTS[destination]);
    };

  const createExpectUnauthorizedAtSpaceWithoutReferencesResult =
    (
      spaceId: string = DEFAULT_SPACE_ID,
      type: 'with-conflicts' | 'without-conflicts' | 'non-existent'
    ) =>
    async (resp: TestResponse) => {
      const destination = getDestinationSpace(spaceId, type);

      const result = resp.body as CopyResponse;
      expect(result).to.eql({
        [destination]: {
          success: false,
          successCount: 0,
          errors: [
            {
              statusCode: 403,
              error: 'Forbidden',
              message: 'Unable to bulk_create dashboard',
            },
          ],
        },
      } as CopyResponse);

      // Query ES to ensure that nothing was copied
      await assertSpaceCounts(destination, INITIAL_COUNTS[destination]);
    };

  const createExpectWithConflictsOverwritingResult =
    (spaceId?: string) => async (resp: { [key: string]: any }) => {
      const destination = getDestinationWithConflicts(spaceId);
      const result = resp.body as CopyResponse;
      expect(result).to.eql({
        [destination]: {
          success: true,
          successCount: 5,
          successResults: [
            {
              id: 'cts_ip_1',
              type: 'index-pattern',
              meta: {
                icon: 'indexPatternApp',
                title: `Copy to Space index pattern 1 from ${spaceId} space`,
              },
              overwrite: true,
            },
            {
              id: `cts_vis_1_${spaceId}`,
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 1 from ${spaceId} space` },
            },
            {
              id: `cts_vis_2_${spaceId}`,
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 2 from ${spaceId} space` },
            },
            {
              id: 'cts_vis_3',
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 3 from ${spaceId} space` },
              overwrite: true,
            },
            {
              id: 'cts_dashboard',
              type: 'dashboard',
              meta: {
                icon: 'dashboardApp',
                title: `This is the ${spaceId} test space CTS dashboard`,
              },
              overwrite: true,
            },
          ],
        },
      } as CopyResponse);

      // Query ES to ensure that we copied everything we expected
      await assertSpaceCounts(destination, {
        dashboard: 2,
        visualization: 5,
        'index-pattern': 1,
      });
    };

  const createExpectWithConflictsWithoutOverwritingResult =
    (spaceId?: string) => async (resp: { [key: string]: any }) => {
      const errorSorter = (e1: any, e2: any) => (e1.id < e2.id ? -1 : 1);

      const destination = getDestinationWithConflicts(spaceId);

      const result = resp.body as CopyResponse;
      result[destination].errors!.sort(errorSorter);

      const expectedSuccessResults = [
        {
          id: `cts_vis_1_${spaceId}`,
          type: 'visualization',
          meta: { icon: 'visualizeApp', title: `CTS vis 1 from ${spaceId} space` },
        },
        {
          id: `cts_vis_2_${spaceId}`,
          type: 'visualization',
          meta: { icon: 'visualizeApp', title: `CTS vis 2 from ${spaceId} space` },
        },
      ];
      const expectedErrors = [
        {
          error: { type: 'conflict' },
          id: 'cts_dashboard',
          title: `This is the ${spaceId} test space CTS dashboard`,
          type: 'dashboard',
          meta: {
            title: `This is the ${spaceId} test space CTS dashboard`,
            icon: 'dashboardApp',
          },
        },
        {
          error: { type: 'conflict' },
          id: 'cts_ip_1',
          title: `Copy to Space index pattern 1 from ${spaceId} space`,
          type: 'index-pattern',
          meta: {
            title: `Copy to Space index pattern 1 from ${spaceId} space`,
            icon: 'indexPatternApp',
          },
        },
        {
          error: { type: 'conflict' },
          id: 'cts_vis_3',
          title: `CTS vis 3 from ${spaceId} space`,
          type: 'visualization',
          meta: {
            title: `CTS vis 3 from ${spaceId} space`,
            icon: 'visualizeApp',
          },
        },
      ];
      expectedErrors.sort(errorSorter);

      expect(result).to.eql({
        [destination]: {
          success: false,
          successCount: 2,
          successResults: expectedSuccessResults,
          errors: expectedErrors,
        },
      } as CopyResponse);

      // Query ES to ensure that no objects were created
      await assertSpaceCounts(destination, INITIAL_COUNTS[destination]);
    };

  /**
   * Creates test cases for multi-namespace saved object types.
   * Note: these are written with the assumption that test data will only be reloaded between each group of test cases, *not* before every
   * single test case. This saves time during test execution.
   */
  const createMultiNamespaceTestCases =
    (
      spaceId: string,
      outcome: 'authorized' | 'unauthorizedRead' | 'unauthorizedWrite' | 'noAccess' = 'authorized'
    ) =>
    (overwrite: boolean, createNewCopies: boolean): CopyToSpaceMultiNamespaceTest[] => {
      // the status code of the HTTP response differs depending on the error type
      // a 403 error actually comes back as an HTTP 200 response
      const statusCode = outcome === 'noAccess' ? 403 : 200;
      const type = 'sharedtype';
      const v4 = new RegExp(
        /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
      );
      const noConflictId = `${spaceId}_only`;
      const exactMatchId = 'each_space';
      const inexactMatchId = `conflict_1_${spaceId}`;
      const ambiguousConflictId = `conflict_2_${spaceId}`;

      const getResult = (response: TestResponse) => (response.body as CopyResponse).space_2;
      const expectSavedObjectForbiddenResponse = (response: TestResponse) => {
        expect(response.body).to.eql({
          space_2: {
            success: false,
            successCount: 0,
            errors: [
              { statusCode: 403, error: 'Forbidden', message: `Unable to bulk_create sharedtype` },
            ],
          },
        });
      };

      const expectNewCopyResponse = (response: TestResponse, sourceId: string, title: string) => {
        const { success, successCount, successResults, errors } = getResult(response);
        expect(success).to.eql(true);
        expect(successCount).to.eql(1);
        const destinationId = successResults![0].destinationId;
        expect(destinationId).to.match(v4);
        const meta = { title, icon: 'beaker' };
        expect(successResults).to.eql([{ type, id: sourceId, meta, destinationId }]);
        expect(errors).to.be(undefined);
      };

      return [
        {
          testTitle: 'copying with no conflict',
          objects: [{ type, id: noConflictId }],
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              const title = 'A shared saved-object in one space';
              // It doesn't matter if createNewCopies is enabled or not, a new copy will be created because two objects cannot exist with the same ID.
              // Note: if createNewCopies is disabled, the new object will have an originId property that matches the source ID, but this is not included in the HTTP response.
              expectNewCopyResponse(response, noConflictId, title);
            } else if (outcome === 'noAccess') {
              expectRouteForbiddenResponse(response);
            } else {
              // unauthorized read/write
              expectSavedObjectForbiddenResponse(response);
            }
          },
        },
        {
          testTitle: 'copying with an exact match conflict',
          objects: [{ type, id: exactMatchId }],
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized' || (outcome === 'unauthorizedWrite' && !createNewCopies)) {
              // If the user is authorized to read in the current space, and is authorized to read in the destination space but not to write
              // (outcome === 'unauthorizedWrite'), *and* createNewCopies is not enabled, the object will be skipped (because it already
              // exists in the destination space) and the user will encounter an empty success result.
              // On the other hand, if the user is authorized to read in the current space but not the destination space (outcome ===
              // 'unauthorizedRead'), the copy attempt will proceed because they are not aware that the object already exists in the
              // destination space. In that case, they will encounter a 403 error.
              const { success, successCount, successResults, errors } = getResult(response);
              const title = 'A shared saved-object in the default, space_1, and space_2 spaces';
              if (createNewCopies) {
                expectNewCopyResponse(response, exactMatchId, title);
              } else {
                // It doesn't matter if overwrite is enabled or not, the object will not be copied because it already exists in the destination space
                expect(success).to.eql(true);
                expect(successCount).to.eql(0);
                expect(successResults).to.be(undefined);
                expect(errors).to.be(undefined);
              }
            } else if (outcome === 'noAccess') {
              expectRouteForbiddenResponse(response);
            } else {
              // unauthorized read/write
              expectSavedObjectForbiddenResponse(response);
            }
          },
        },
        {
          testTitle: 'copying with an inexact match conflict',
          objects: [{ type, id: inexactMatchId }],
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              const { success, successCount, successResults, errors } = getResult(response);
              const title = 'A shared saved-object in one space';
              const meta = { title, icon: 'beaker' };
              const destinationId = 'conflict_1_space_2';
              if (createNewCopies) {
                expectNewCopyResponse(response, inexactMatchId, title);
              } else if (overwrite) {
                expect(success).to.eql(true);
                expect(successCount).to.eql(1);
                expect(successResults).to.eql([
                  { type, id: inexactMatchId, meta, overwrite: true, destinationId },
                ]);
                expect(errors).to.be(undefined);
              } else {
                expect(success).to.eql(false);
                expect(successCount).to.eql(0);
                expect(successResults).to.be(undefined);
                expect(errors).to.eql([
                  {
                    error: { type: 'conflict', destinationId },
                    type,
                    id: inexactMatchId,
                    title,
                    meta,
                  },
                ]);
              }
            } else if (outcome === 'noAccess') {
              expectRouteForbiddenResponse(response);
            } else {
              // unauthorized read/write
              expectSavedObjectForbiddenResponse(response);
            }
          },
        },
        {
          testTitle: 'copying with an ambiguous conflict',
          objects: [{ type, id: ambiguousConflictId }],
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              const { success, successCount, successResults, errors } = getResult(response);
              const title = 'A shared saved-object in one space';
              if (createNewCopies) {
                expectNewCopyResponse(response, ambiguousConflictId, title);
              } else {
                // The `updatedAt` values cannot be determined upfront and hence asserted since we update spaces list
                // for certain objects in the test setup.
                const importAmbiguousConflictError = (errors as SavedObjectsImportFailure[])?.[0]
                  .error as SavedObjectsImportAmbiguousConflictError;
                // It doesn't matter if overwrite is enabled or not, the object will not be copied because there are two matches in the destination space
                const destinations = [
                  // response destinations should be sorted by ID in ascending order
                  {
                    id: 'conflict_2_all',
                    title: 'A shared saved-object in all spaces',
                    updatedAt: importAmbiguousConflictError?.destinations[0].updatedAt,
                  },
                  {
                    id: 'conflict_2_space_2',
                    title: 'A shared saved-object in one space',
                    updatedAt: importAmbiguousConflictError?.destinations[1].updatedAt,
                  },
                ];
                expect(success).to.eql(false);
                expect(successCount).to.eql(0);
                expect(successResults).to.be(undefined);
                expect(errors).to.eql([
                  {
                    error: { type: 'ambiguous_conflict', destinations },
                    type,
                    id: ambiguousConflictId,
                    title,
                    meta: { title, icon: 'beaker' },
                  },
                ]);
              }
            } else if (outcome === 'noAccess') {
              expectRouteForbiddenResponse(response);
            } else {
              // unauthorized read/write
              expectSavedObjectForbiddenResponse(response);
            }
          },
        },
      ];
    };

  const makeCopyToSpaceTest =
    (describeFn: DescribeFn) =>
    (
      description: string,
      { user = {}, spaceId = DEFAULT_SPACE_ID, tests }: CopyToSpaceTestDefinition
    ) => {
      describeFn(description, () => {
        before(async () => {
          // test data only allows for the following spaces as the copy origin
          expect(['default', 'space_1']).to.contain(spaceId);

          await testDataLoader.createFtrSpaces();
        });

        after(async () => {
          await testDataLoader.deleteFtrSpaces();
        });

        describe('single-namespace types', () => {
          beforeEach(async () => {
            await testDataLoader.createFtrSavedObjectsData(SPACE_DATA_TO_LOAD);
          });

          afterEach(async () => await testDataLoader.deleteFtrSavedObjectsData());

          const dashboardObject = { type: 'dashboard', id: 'cts_dashboard' };

          it(`should return ${tests.noConflictsWithoutReferences.statusCode} when copying to space without conflicts or references`, async () => {
            const destination = getDestinationWithoutConflicts();

            await assertSpaceCounts(destination, INITIAL_COUNTS[destination]);

            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_copy_saved_objects`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                spaces: [destination],
                includeReferences: false,
                createNewCopies: false,
                overwrite: false,
              })
              .expect(tests.noConflictsWithoutReferences.statusCode)
              .then(tests.noConflictsWithoutReferences.response);
          });

          it(`should return ${tests.noConflictsWithReferences.statusCode} when copying to space without conflicts with references`, async () => {
            const destination = getDestinationWithoutConflicts();

            await assertSpaceCounts(destination, INITIAL_COUNTS[destination]);

            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_copy_saved_objects`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                spaces: [destination],
                includeReferences: true,
                createNewCopies: false,
                overwrite: false,
              })
              .expect(tests.noConflictsWithReferences.statusCode)
              .then(tests.noConflictsWithReferences.response);
          });

          it(`should return ${tests.withConflictsOverwriting.statusCode} when copying to space with conflicts when overwriting`, async () => {
            const destination = getDestinationWithConflicts(spaceId);

            await assertSpaceCounts(destination, INITIAL_COUNTS[destination]);

            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_copy_saved_objects`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                spaces: [destination],
                includeReferences: true,
                createNewCopies: false,
                overwrite: true,
              })
              .expect(tests.withConflictsOverwriting.statusCode)
              .then(tests.withConflictsOverwriting.response);
          });

          it(`should return ${tests.withConflictsWithoutOverwriting.statusCode} when copying to space with conflicts without overwriting`, async () => {
            const destination = getDestinationWithConflicts(spaceId);

            await assertSpaceCounts(destination, INITIAL_COUNTS[destination]);

            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_copy_saved_objects`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                spaces: [destination],
                includeReferences: true,
                createNewCopies: false,
                overwrite: false,
              })
              .expect(tests.withConflictsWithoutOverwriting.statusCode)
              .then(tests.withConflictsWithoutOverwriting.response);
          });

          it(`should return ${tests.multipleSpaces.statusCode} when copying to multiple spaces`, async () => {
            const conflictDestination = getDestinationWithConflicts(spaceId);
            const noConflictDestination = getDestinationWithoutConflicts();

            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_copy_saved_objects`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                spaces: [conflictDestination, noConflictDestination],
                includeReferences: true,
                createNewCopies: false,
                overwrite: true,
              })
              .expect(tests.multipleSpaces.statusCode)
              .then((response: TestResponse) => {
                if (tests.multipleSpaces.statusCode === 200) {
                  expect(Object.keys(response.body).length).to.eql(2);
                  return Promise.all([
                    tests.multipleSpaces.noConflictsResponse({
                      body: { [noConflictDestination]: response.body[noConflictDestination] },
                    }),
                    tests.multipleSpaces.withConflictsResponse({
                      body: { [conflictDestination]: response.body[conflictDestination] },
                    }),
                  ]);
                }

                // non-200 status codes will not have a response body broken out by space id, like above.
                return Promise.all([
                  tests.multipleSpaces.noConflictsResponse(response),
                  tests.multipleSpaces.withConflictsResponse(response),
                ]);
              });
          });

          it(`should return ${tests.nonExistentSpace.statusCode} when copying to non-existent space`, async () => {
            return supertestWithoutAuth
              .post(`${getUrlPrefix(spaceId)}/api/spaces/_copy_saved_objects`)
              .auth(user.username, user.password)
              .send({
                objects: [dashboardObject],
                spaces: ['non_existent_space'],
                includeReferences: false,
                createNewCopies: false,
                overwrite: true,
              })
              .expect(tests.nonExistentSpace.statusCode)
              .then(tests.nonExistentSpace.response);
          });
        });

        [
          [false, false],
          [false, true], // createNewCopies enabled
          [true, false], // overwrite enabled
          // we don't specify tese cases with both overwrite and createNewCopies enabled, since overwrite won't matter in that scenario
        ].forEach(([overwrite, createNewCopies]) => {
          const spaces = ['space_2'];
          const includeReferences = false;
          describe(`multi-namespace types with overwrite=${overwrite} and createNewCopies=${createNewCopies}`, () => {
            before(async () => await testDataLoader.createFtrSavedObjectsData(SPACE_DATA_TO_LOAD));
            after(async () => await testDataLoader.deleteFtrSavedObjectsData());

            const testCases = tests.multiNamespaceTestCases(overwrite, createNewCopies);
            testCases.forEach(({ testTitle, objects, statusCode, response }) => {
              it(`should return ${statusCode} when ${testTitle}`, async () => {
                return supertestWithoutAuth
                  .post(`${getUrlPrefix(spaceId)}/api/spaces/_copy_saved_objects`)
                  .auth(user.username, user.password)
                  .send({ objects, spaces, includeReferences, createNewCopies, overwrite })
                  .expect(statusCode)
                  .then(response);
              });
            });
          });
        });
      });
    };

  const copyToSpaceTest = makeCopyToSpaceTest(describe);
  // @ts-expect-error
  copyToSpaceTest.only = makeCopyToSpaceTest(describe.only);

  return {
    copyToSpaceTest,
    expectNoConflictsWithoutReferencesResult,
    expectNoConflictsWithReferencesResult,
    expectNoConflictsForNonExistentSpaceResult,
    createExpectWithConflictsOverwritingResult,
    createExpectWithConflictsWithoutOverwritingResult,
    expectRouteForbiddenResponse,
    expectRouteNotFoundResponse,
    createExpectUnauthorizedAtSpaceWithReferencesResult,
    createExpectUnauthorizedAtSpaceWithoutReferencesResult,
    createMultiNamespaceTestCases,
    originSpaces: ['default', 'space_1'],
  };
}
