/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { EsArchiver } from 'src/es_archiver';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';
import { CopyResponse } from '../../../../plugins/spaces/server/lib/copy_to_spaces';
import { getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

type TestResponse = Record<string, any>;

interface CopyToSpaceTest {
  statusCode: number;
  response: (resp: TestResponse) => Promise<void>;
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
  [DEFAULT_SPACE_ID]: {
    dashboard: 2,
    visualization: 3,
    'index-pattern': 1,
  },
  space_1: {
    dashboard: 2,
    visualization: 3,
    'index-pattern': 1,
  },
  space_2: {
    dashboard: 1,
  },
};

const getDestinationWithoutConflicts = () => 'space_2';
const getDestinationWithConflicts = (originSpaceId?: string) => {
  if (!originSpaceId || originSpaceId === DEFAULT_SPACE_ID) {
    return 'space_1';
  }
  return DEFAULT_SPACE_ID;
};

export function copyToSpaceTestSuiteFactory(
  es: any,
  esArchiver: EsArchiver,
  supertest: SuperTest<any>
) {
  const collectSpaceContents = async () => {
    const response = await es.search({
      index: '.kibana',
      body: {
        size: 0,
        query: {
          terms: {
            type: ['visualization', 'dashboard', 'index-pattern'],
          },
        },
        aggs: {
          count: {
            terms: {
              field: 'namespace',
              missing: DEFAULT_SPACE_ID,
              size: 10,
            },
            aggs: {
              countByType: {
                terms: {
                  field: 'type',
                  missing: 'UNKNOWN',
                  size: 10,
                },
              },
            },
          },
        },
      },
    });

    return {
      buckets: response.aggregations.count.buckets as SpaceBucket[],
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
      return [
        ...acc,
        {
          key: type,
          doc_count: count,
        },
      ];
    }, [] as CountByTypeBucket[]);

    expectedBuckets.sort(bucketSorter);
    countByType.buckets.sort(bucketSorter);

    expect(countByType).to.eql({
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: expectedBuckets,
    });
  };

  const expectRbacForbiddenResponse = async (resp: TestResponse) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unable to bulk_get dashboard',
    });
  };

  const expectNotFoundResponse = async (resp: TestResponse) => {
    expect(resp.body).to.eql({
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found',
    });
  };

  const createExpectNoConflictsWithoutReferencesForSpace = (
    spaceId: string,
    expectedDashboardCount: number
  ) => async (resp: TestResponse) => {
    const result = resp.body as CopyResponse;
    expect(result).to.eql({
      [spaceId]: {
        success: true,
        successCount: 1,
      },
    } as CopyResponse);

    // Query ES to ensure that we copied everything we expected
    await assertSpaceCounts(spaceId, {
      dashboard: expectedDashboardCount,
    });
  };

  const expectNoConflictsWithoutReferencesResult = createExpectNoConflictsWithoutReferencesForSpace(
    getDestinationWithoutConflicts(),
    2
  );

  const expectNoConflictsForNonExistentSpaceResult = createExpectNoConflictsWithoutReferencesForSpace(
    'non_existent_space',
    1
  );

  const expectNoConflictsWithReferencesResult = async (resp: TestResponse) => {
    const destination = getDestinationWithoutConflicts();
    const result = resp.body as CopyResponse;
    expect(result).to.eql({
      [destination]: {
        success: true,
        successCount: 5,
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

  const createExpectUnauthorizedAtSpaceWithReferencesResult = (
    spaceId: string = DEFAULT_SPACE_ID,
    type: 'with-conflicts' | 'without-conflicts'
  ) => async (resp: TestResponse) => {
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

  const createExpectUnauthorizedAtSpaceWithoutReferencesResult = (
    spaceId: string = DEFAULT_SPACE_ID,
    type: 'with-conflicts' | 'without-conflicts' | 'non-existent'
  ) => async (resp: TestResponse) => {
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

  const createExpectWithConflictsOverwritingResult = (spaceId?: string) => async (resp: {
    [key: string]: any;
  }) => {
    const destination = getDestinationWithConflicts(spaceId);
    const result = resp.body as CopyResponse;
    expect(result).to.eql({
      [destination]: {
        success: true,
        successCount: 5,
      },
    } as CopyResponse);

    // Query ES to ensure that we copied everything we expected
    await assertSpaceCounts(destination, {
      dashboard: 2,
      visualization: 5,
      'index-pattern': 1,
    });
  };

  const createExpectWithConflictsWithoutOverwritingResult = (spaceId?: string) => async (resp: {
    [key: string]: any;
  }) => {
    const errorSorter = (e1: any, e2: any) => (e1.id < e2.id ? -1 : 1);

    const destination = getDestinationWithConflicts(spaceId);

    const result = resp.body as CopyResponse;
    result[destination].errors!.sort(errorSorter);

    const expectedErrors = [
      {
        error: {
          type: 'conflict',
        },
        id: 'cts_dashboard',
        title: `This is the ${spaceId} test space CTS dashboard`,
        type: 'dashboard',
      },
      {
        error: {
          type: 'conflict',
        },
        id: 'cts_ip_1',
        title: `Copy to Space index pattern 1 from ${spaceId} space`,
        type: 'index-pattern',
      },
      {
        error: {
          type: 'conflict',
        },
        id: 'cts_vis_3',
        title: `CTS vis 3 from ${spaceId} space`,
        type: 'visualization',
      },
    ];
    expectedErrors.sort(errorSorter);

    expect(result).to.eql({
      [destination]: {
        success: false,
        successCount: 2,
        errors: expectedErrors,
      },
    } as CopyResponse);

    // Query ES to ensure that we copied everything we expected
    await assertSpaceCounts(destination, {
      dashboard: 2,
      visualization: 5,
      'index-pattern': 1,
    });
  };

  const makeCopyToSpaceTest = (describeFn: DescribeFn) => (
    description: string,
    { user = {}, spaceId = DEFAULT_SPACE_ID, tests }: CopyToSpaceTestDefinition
  ) => {
    describeFn(description, () => {
      before(() => {
        // test data only allows for the following spaces as the copy origin
        expect(['default', 'space_1']).to.contain(spaceId);
      });

      beforeEach(() => esArchiver.load('saved_objects/spaces'));
      afterEach(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.noConflictsWithoutReferences.statusCode} when copying to space without conflicts or references`, async () => {
        const destination = getDestinationWithoutConflicts();

        await assertSpaceCounts(destination, INITIAL_COUNTS[destination]);

        return supertest
          .post(`${getUrlPrefix(spaceId)}/api/spaces/_copy_saved_objects`)
          .auth(user.username, user.password)
          .send({
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            spaces: [destination],
            includeReferences: false,
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
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            spaces: [destination],
            includeReferences: true,
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
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            spaces: [destination],
            includeReferences: true,
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
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            spaces: [destination],
            includeReferences: true,
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
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            spaces: [conflictDestination, noConflictDestination],
            includeReferences: true,
            overwrite: true,
          })
          .expect(tests.multipleSpaces.statusCode)
          .then((response: TestResponse) => {
            if (tests.multipleSpaces.statusCode === 200) {
              expect(Object.keys(response.body).length).to.eql(2);
              return Promise.all([
                tests.multipleSpaces.noConflictsResponse({
                  body: {
                    [noConflictDestination]: response.body[noConflictDestination],
                  },
                }),
                tests.multipleSpaces.withConflictsResponse({
                  body: {
                    [conflictDestination]: response.body[conflictDestination],
                  },
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
            objects: [
              {
                type: 'dashboard',
                id: 'cts_dashboard',
              },
            ],
            spaces: ['non_existent_space'],
            includeReferences: false,
            overwrite: true,
          })
          .expect(tests.nonExistentSpace.statusCode)
          .then(tests.nonExistentSpace.response);
      });
    });
  };

  const copyToSpaceTest = makeCopyToSpaceTest(describe);
  // @ts-ignore
  copyToSpaceTest.only = makeCopyToSpaceTest(describe.only);

  return {
    copyToSpaceTest,
    expectNoConflictsWithoutReferencesResult,
    expectNoConflictsWithReferencesResult,
    expectNoConflictsForNonExistentSpaceResult,
    createExpectWithConflictsOverwritingResult,
    createExpectWithConflictsWithoutOverwritingResult,
    expectRbacForbiddenResponse,
    expectNotFoundResponse,
    createExpectUnauthorizedAtSpaceWithReferencesResult,
    createExpectUnauthorizedAtSpaceWithoutReferencesResult,
    originSpaces: ['default', 'space_1'],
  };
}
