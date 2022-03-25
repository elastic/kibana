/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { EsArchiver } from '@kbn/es-archiver';
import type { Client } from '@elastic/elasticsearch';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';
import { CopyResponse } from '../../../../plugins/spaces/server/lib/copy_to_spaces';
import { getAggregatedSpaceData, getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

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
  [DEFAULT_SPACE_ID]: { dashboard: 1, visualization: 3, 'index-pattern': 1 },
  space_1: { dashboard: 1, visualization: 3, 'index-pattern': 1 },
};
const UUID_PATTERN = new RegExp(
  /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
);

const getDestinationWithoutConflicts = () => 'space_2';
const getDestinationWithConflicts = (originSpaceId?: string) =>
  !originSpaceId || originSpaceId === DEFAULT_SPACE_ID ? 'space_1' : DEFAULT_SPACE_ID;

interface Aggs extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: SpaceBucket[];
}
export function copyToSpaceTestSuiteFactory(
  es: Client,
  esArchiver: EsArchiver,
  supertest: SuperTest<any>
) {
  const collectSpaceContents = async () => {
    const response = await getAggregatedSpaceData(es, [
      'visualization',
      'dashboard',
      'index-pattern',
    ]);

    const aggs = response.aggregations as Record<string, Aggs>;
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

      const dashboardDestinationId = result[destination].successResults![0].destinationId;
      expect(dashboardDestinationId).to.match(UUID_PATTERN); // this was copied to space 2 and hit an unresolvable conflict, so the object ID was regenerated silently / the destinationId is a UUID

      expect(result).to.eql({
        [destination]: {
          success: true,
          successCount: 1,
          successResults: [
            {
              id: `cts_dashboard_${spaceId}`,
              type: 'dashboard',
              meta: {
                title: `This is the ${spaceId} test space CTS dashboard`,
                icon: 'dashboardApp',
              },
              destinationId: dashboardDestinationId,
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
    createExpectNoConflictsWithoutReferencesForSpace(spaceId, getDestinationWithoutConflicts(), 1);

  const expectNoConflictsForNonExistentSpaceResult = (spaceId: string = DEFAULT_SPACE_ID) =>
    createExpectNoConflictsWithoutReferencesForSpace(spaceId, 'non_existent_space', 1);

  const expectNoConflictsWithReferencesResult =
    (spaceId: string = DEFAULT_SPACE_ID) =>
    async (resp: TestResponse) => {
      const destination = getDestinationWithoutConflicts();
      const result = resp.body as CopyResponse;

      const indexPatternDestinationId = result[destination].successResults![0].destinationId;
      expect(indexPatternDestinationId).to.match(UUID_PATTERN); // this was copied to space 2 and hit an unresolvable conflict, so the object ID was regenerated silently / the destinationId is a UUID
      const vis1DestinationId = result[destination].successResults![1].destinationId;
      expect(vis1DestinationId).to.match(UUID_PATTERN); // this was copied to space 2 and hit an unresolvable conflict, so the object ID was regenerated silently / the destinationId is a UUID
      const vis2DestinationId = result[destination].successResults![2].destinationId;
      expect(vis2DestinationId).to.match(UUID_PATTERN); // this was copied to space 2 and hit an unresolvable conflict, so the object ID was regenerated silently / the destinationId is a UUID
      const vis3DestinationId = result[destination].successResults![3].destinationId;
      expect(vis3DestinationId).to.match(UUID_PATTERN); // this was copied to space 2 and hit an unresolvable conflict, so the object ID was regenerated silently / the destinationId is a UUID
      const dashboardDestinationId = result[destination].successResults![4].destinationId;
      expect(dashboardDestinationId).to.match(UUID_PATTERN); // this was copied to space 2 and hit an unresolvable conflict, so the object ID was regenerated silently / the destinationId is a UUID

      expect(result).to.eql({
        [destination]: {
          success: true,
          successCount: 5,
          successResults: [
            {
              id: `cts_ip_1_${spaceId}`,
              type: 'index-pattern',
              meta: {
                icon: 'indexPatternApp',
                title: `Copy to Space index pattern 1 from ${spaceId} space`,
              },
              destinationId: indexPatternDestinationId,
            },
            {
              id: `cts_vis_1_${spaceId}`,
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 1 from ${spaceId} space` },
              destinationId: vis1DestinationId,
            },
            {
              id: `cts_vis_2_${spaceId}`,
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 2 from ${spaceId} space` },
              destinationId: vis2DestinationId,
            },
            {
              id: `cts_vis_3_${spaceId}`,
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 3 from ${spaceId} space` },
              destinationId: vis3DestinationId,
            },
            {
              id: `cts_dashboard_${spaceId}`,
              type: 'dashboard',
              meta: {
                icon: 'dashboardApp',
                title: `This is the ${spaceId} test space CTS dashboard`,
              },
              destinationId: dashboardDestinationId,
            },
          ],
        },
      } as CopyResponse);

      // Query ES to ensure that we copied everything we expected
      await assertSpaceCounts(destination, {
        dashboard: 1,
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

      const vis1DestinationId = result[destination].successResults![1].destinationId;
      expect(vis1DestinationId).to.match(UUID_PATTERN); // this was copied to space 2 and hit an unresolvable conflict, so the object ID was regenerated silently / the destinationId is a UUID
      const vis2DestinationId = result[destination].successResults![2].destinationId;
      expect(vis2DestinationId).to.match(UUID_PATTERN); // this was copied to space 2 and hit an unresolvable conflict, so the object ID was regenerated silently / the destinationId is a UUID

      expect(result).to.eql({
        [destination]: {
          success: true,
          successCount: 5,
          successResults: [
            {
              id: `cts_ip_1_${spaceId}`,
              type: 'index-pattern',
              meta: {
                icon: 'indexPatternApp',
                title: `Copy to Space index pattern 1 from ${spaceId} space`,
              },
              overwrite: true,
              destinationId: `cts_ip_1_${destination}`, // this conflicted with another index pattern in the destination space because of a shared originId
            },
            {
              id: `cts_vis_1_${spaceId}`,
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 1 from ${spaceId} space` },
              destinationId: vis1DestinationId,
            },
            {
              id: `cts_vis_2_${spaceId}`,
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 2 from ${spaceId} space` },
              destinationId: vis2DestinationId,
            },
            {
              id: `cts_vis_3_${spaceId}`,
              type: 'visualization',
              meta: { icon: 'visualizeApp', title: `CTS vis 3 from ${spaceId} space` },
              overwrite: true,
              destinationId: `cts_vis_3_${destination}`, // this conflicted with another visualization in the destination space because of a shared originId
            },
            {
              id: `cts_dashboard_${spaceId}`,
              type: 'dashboard',
              meta: {
                icon: 'dashboardApp',
                title: `This is the ${spaceId} test space CTS dashboard`,
              },
              overwrite: true,
              destinationId: `cts_dashboard_${destination}`, // this conflicted with another dashboard in the destination space because of a shared originId
            },
          ],
        },
      } as CopyResponse);

      // Query ES to ensure that we copied everything we expected
      await assertSpaceCounts(destination, {
        dashboard: 1,
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

      const vis1DestinationId = result[destination].successResults![0].destinationId;
      expect(vis1DestinationId).to.match(UUID_PATTERN); // this was copied to space 2 and hit an unresolvable conflict, so the object ID was regenerated silently / the destinationId is a UUID
      const vis2DestinationId = result[destination].successResults![1].destinationId;
      expect(vis2DestinationId).to.match(UUID_PATTERN); // this was copied to space 2 and hit an unresolvable conflict, so the object ID was regenerated silently / the destinationId is a UUID

      const expectedSuccessResults = [
        {
          id: `cts_vis_1_${spaceId}`,
          type: 'visualization',
          meta: { icon: 'visualizeApp', title: `CTS vis 1 from ${spaceId} space` },
          destinationId: vis1DestinationId,
        },
        {
          id: `cts_vis_2_${spaceId}`,
          type: 'visualization',
          meta: { icon: 'visualizeApp', title: `CTS vis 2 from ${spaceId} space` },
          destinationId: vis2DestinationId,
        },
      ];
      const expectedErrors = [
        {
          error: {
            type: 'conflict',
            destinationId: `cts_dashboard_${destination}`, // this conflicted with another dashboard in the destination space because of a shared originId
          },
          id: `cts_dashboard_${spaceId}`,
          type: 'dashboard',
          meta: {
            title: `This is the ${spaceId} test space CTS dashboard`,
            icon: 'dashboardApp',
          },
        },
        {
          error: {
            type: 'conflict',
            destinationId: `cts_ip_1_${destination}`, // this conflicted with another index pattern in the destination space because of a shared originId
          },
          id: `cts_ip_1_${spaceId}`,
          type: 'index-pattern',
          meta: {
            title: `Copy to Space index pattern 1 from ${spaceId} space`,
            icon: 'indexPatternApp',
          },
        },
        {
          error: {
            type: 'conflict',
            destinationId: `cts_vis_3_${destination}`, // this conflicted with another visualization in the destination space because of a shared originId
          },
          id: `cts_vis_3_${spaceId}`,
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
      const noConflictId = `${spaceId}_only`;
      const exactMatchId = 'each_space';
      const inexactMatchIdA = `conflict_1a_${spaceId}`;
      const inexactMatchIdB = `conflict_1b_${spaceId}`;
      const inexactMatchIdC = `conflict_1c_default_and_space_1`;
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
        expect(destinationId).to.match(UUID_PATTERN);
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
          testTitle:
            'copying with an inexact match conflict (a) - originId matches existing originId',
          objects: [{ type, id: inexactMatchIdA }],
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              const { success, successCount, successResults, errors } = getResult(response);
              const title =
                'This is used to test an inexact match conflict for an originId -> originId match';
              const meta = { title, icon: 'beaker' };
              const destinationId = 'conflict_1a_space_2';
              if (createNewCopies) {
                expectNewCopyResponse(response, inexactMatchIdA, title);
              } else if (overwrite) {
                expect(success).to.eql(true);
                expect(successCount).to.eql(1);
                expect(successResults).to.eql([
                  { type, id: inexactMatchIdA, meta, overwrite: true, destinationId },
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
                    id: inexactMatchIdA,
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
          testTitle: 'copying with an inexact match conflict (b) - originId matches existing id',
          objects: [{ type, id: inexactMatchIdB }],
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              const { success, successCount, successResults, errors } = getResult(response);
              const title =
                'This is used to test an inexact match conflict for an originId -> id match';
              const meta = { title, icon: 'beaker' };
              const destinationId = 'conflict_1b_space_2';
              if (createNewCopies) {
                expectNewCopyResponse(response, inexactMatchIdB, title);
              } else if (overwrite) {
                expect(success).to.eql(true);
                expect(successCount).to.eql(1);
                expect(successResults).to.eql([
                  { type, id: inexactMatchIdB, meta, overwrite: true, destinationId },
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
                    id: inexactMatchIdB,
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
          testTitle: 'copying with an inexact match conflict (c) - id matches existing originId',
          objects: [{ type, id: inexactMatchIdC }],
          statusCode,
          response: async (response: TestResponse) => {
            if (outcome === 'authorized') {
              const { success, successCount, successResults, errors } = getResult(response);
              const title =
                'This is used to test an inexact match conflict for an id -> originId match';
              const meta = { title, icon: 'beaker' };
              const destinationId = 'conflict_1c_space_2';
              if (createNewCopies) {
                expectNewCopyResponse(response, inexactMatchIdC, title);
              } else if (overwrite) {
                expect(success).to.eql(true);
                expect(successCount).to.eql(1);
                expect(successResults).to.eql([
                  { type, id: inexactMatchIdC, meta, overwrite: true, destinationId },
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
                    id: inexactMatchIdC,
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
                // It doesn't matter if overwrite is enabled or not, the object will not be copied because there are two matches in the destination space
                const destinations = [
                  // response destinations should be sorted by updatedAt in descending order, then ID in ascending order
                  {
                    id: 'conflict_2_all',
                    title: 'A shared saved-object in all spaces',
                    updatedAt: '2017-09-21T18:59:16.270Z',
                  },
                  {
                    id: 'conflict_2_space_2',
                    title: 'A shared saved-object in one space',
                    updatedAt: '2017-09-21T18:59:16.270Z',
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
        before(() => {
          // test data only allows for the following spaces as the copy origin
          expect(['default', 'space_1']).to.contain(spaceId);
        });

        describe('single-namespace types', () => {
          beforeEach(() =>
            esArchiver.load(
              'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
            )
          );
          afterEach(() =>
            esArchiver.unload(
              'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
            )
          );

          const dashboardObject = { type: 'dashboard', id: `cts_dashboard_${spaceId}` };

          it(`should return ${tests.noConflictsWithoutReferences.statusCode} when copying to space without conflicts or references`, async () => {
            const destination = getDestinationWithoutConflicts();

            await assertSpaceCounts(destination, INITIAL_COUNTS[destination]);

            return supertest
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

            return supertest
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

            return supertest
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

            return supertest
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

            return supertest
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
            return supertest
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

            const testCases = tests.multiNamespaceTestCases(overwrite, createNewCopies);
            testCases.forEach(({ testTitle, objects, statusCode, response }) => {
              it(`should return ${statusCode} when ${testTitle}`, async () => {
                return supertest
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
