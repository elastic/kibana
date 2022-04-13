/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import { getAggregatedSpaceData, getTestScenariosForSpace } from '../lib/space_test_utils';
import { MULTI_NAMESPACE_SAVED_OBJECT_TEST_CASES as CASES } from '../lib/saved_object_test_cases';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface DeleteTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface DeleteTests {
  exists: DeleteTest;
  reservedSpace: DeleteTest;
  doesntExist: DeleteTest;
}

interface DeleteTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId: string;
  tests: DeleteTests;
}

export function deleteTestSuiteFactory(es: Client, esArchiver: any, supertest: SuperTest<any>) {
  const createExpectResult = (expectedResult: any) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql(expectedResult);
  };

  const expectEmptyResult = async (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql('');

    // Query ES to ensure that we deleted everything we expected, and nothing we didn't
    // Grouping first by namespace, then by saved object type
    const response = await getAggregatedSpaceData(es, [
      'visualization',
      'dashboard',
      'space',
      'index-pattern',
      'legacy-url-alias',
      // TODO: add assertions for config objects -- these assertions were removed because of flaky behavior in #92358, but we should
      // consider adding them again at some point, especially if we convert config objects to `namespaceType: 'multiple-isolated'` in
      // the future.
    ]);

    // @ts-expect-error @elastic/elasticsearch doesn't defined `count.buckets`.
    const buckets = response.aggregations?.count.buckets;

    // The test fixture contains six legacy URL aliases:
    // (1) two for "default", (2) two for "space_2", and (3) two for "other_space", which is a non-existent space.
    // Each test deletes "space_2", so the agg buckets should reflect that aliases (1) and (3) still exist afterwards.

    // Space 2 deleted, all others should exist
    const expectedBuckets = [
      {
        key: 'default',
        doc_count: 9,
        countByType: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            { key: 'visualization', doc_count: 3 },
            { key: 'legacy-url-alias', doc_count: 2 }, // aliases (1)
            { key: 'space', doc_count: 2 }, // since space objects are namespace-agnostic, they appear in the "default" agg bucket
            { key: 'dashboard', doc_count: 1 },
            { key: 'index-pattern', doc_count: 1 },
          ],
        },
      },
      {
        doc_count: 5,
        key: 'space_1',
        countByType: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            { key: 'visualization', doc_count: 3 },
            { key: 'dashboard', doc_count: 1 },
            { key: 'index-pattern', doc_count: 1 },
            // no legacy url alias objects exist in space_1
          ],
        },
      },
      {
        doc_count: 2,
        key: 'other_space',
        countByType: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [{ key: 'legacy-url-alias', doc_count: 2 }], // aliases (3)
        },
      },
    ];

    expect(buckets).to.eql(expectedBuckets);

    // There were 22 multi-namespace objects.
    // Since Space 2 was deleted, any multi-namespace objects that existed in that space
    // are updated to remove it, and of those, any that don't exist in any space are deleted.
    const multiNamespaceResponse = await es.search<Record<string, any>>({
      index: '.kibana',
      size: 20,
      body: { query: { terms: { type: ['sharedtype'] } } },
    });
    const docs = multiNamespaceResponse.hits.hits;
    // Just 17 results, since spaces_2_only, conflict_1a_space_2, conflict_1b_space_2, conflict_1c_space_2, and conflict_2_space_2 got deleted.
    expect(docs).length(17);
    docs.forEach((doc) => () => {
      const containsSpace2 = doc?._source?.namespaces.includes('space_2');
      expect(containsSpace2).to.eql(false);
    });
    const space2OnlyObjExists = docs.some((x) => x._id === CASES.SPACE_2_ONLY.id);
    expect(space2OnlyObjExists).to.eql(false);
  };

  const expectNotFound = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Not Found',
      statusCode: 404,
      message: 'Not Found',
    });
  };

  const expectRbacForbidden = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unauthorized to delete spaces',
    });
  };

  const expectReservedSpaceResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Bad Request',
      statusCode: 400,
      message: `The default space cannot be deleted because it is reserved.`,
    });
  };

  const makeDeleteTest =
    (describeFn: DescribeFn) =>
    (description: string, { user = {}, spaceId, tests }: DeleteTestDefinition) => {
      describeFn(description, () => {
        beforeEach(async () => {
          await esArchiver.load(
            'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
          );
        });
        afterEach(() =>
          esArchiver.unload(
            'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
          )
        );

        getTestScenariosForSpace(spaceId).forEach(({ urlPrefix, scenario }) => {
          it(`should return ${tests.exists.statusCode} ${scenario}`, async () => {
            return supertest
              .delete(`${urlPrefix}/api/spaces/space/space_2`)
              .auth(user.username, user.password)
              .expect(tests.exists.statusCode)
              .then(tests.exists.response);
          });

          describe(`when the space is reserved`, () => {
            it(`should return ${tests.reservedSpace.statusCode} ${scenario}`, async () => {
              return supertest
                .delete(`${urlPrefix}/api/spaces/space/default`)
                .auth(user.username, user.password)
                .expect(tests.reservedSpace.statusCode)
                .then(tests.reservedSpace.response);
            });
          });

          describe(`when the space doesn't exist`, () => {
            it(`should return ${tests.doesntExist.statusCode} ${scenario}`, async () => {
              return supertest
                .delete(`${urlPrefix}/api/spaces/space/space_3`)
                .auth(user.username, user.password)
                .expect(tests.doesntExist.statusCode)
                .then(tests.doesntExist.response);
            });
          });
        });
      });
    };

  const deleteTest = makeDeleteTest(describe);
  // @ts-ignore
  deleteTest.only = makeDeleteTest(describe.only);

  return {
    createExpectResult,
    deleteTest,
    expectEmptyResult,
    expectNotFound,
    expectRbacForbidden,
    expectReservedSpaceResult,
  };
}
