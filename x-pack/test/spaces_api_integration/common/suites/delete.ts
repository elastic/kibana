/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { getUrlPrefix } from '../lib/space_test_utils';
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

export function deleteTestSuiteFactory(es: any, esArchiver: any, supertest: SuperTest<any>) {
  const createExpectResult = (expectedResult: any) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql(expectedResult);
  };

  const expectEmptyResult = async (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql('');

    // Query ES to ensure that we deleted everything we expected, and nothing we didn't
    // Grouping first by namespace, then by saved object type
    const response = await es.search({
      index: '.kibana',
      body: {
        size: 0,
        aggs: {
          count: {
            terms: {
              field: 'namespace',
              missing: 'default',
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

    const buckets = response.aggregations.count.buckets;

    // Space 2 deleted, all others should exist
    const expectedBuckets = [
      {
        key: 'default',
        doc_count: 4,
        countByType: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'space',
              doc_count: 2,
            },
            {
              key: 'config',
              doc_count: 1,
            },
            {
              key: 'dashboard',
              doc_count: 1,
            },
          ],
        },
      },
      {
        doc_count: 2,
        key: 'space_1',
        countByType: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'config',
              doc_count: 1,
            },
            {
              key: 'dashboard',
              doc_count: 1,
            },
          ],
        },
      },
    ];

    expect(buckets).to.eql(expectedBuckets);
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
      message: `This Space cannot be deleted because it is reserved.`,
    });
  };

  const makeDeleteTest = (describeFn: DescribeFn) => (
    description: string,
    { user = {}, spaceId, tests }: DeleteTestDefinition
  ) => {
    describeFn(description, () => {
      before(async () => {
        await esArchiver.load('saved_objects/spaces');

        // since we want to verify that we only delete the right things
        // and can't include a config document with the correct id in the
        // archive we read the settings to trigger an automatic upgrade
        // in each space
        await supertest
          .get('/api/kibana/settings')
          .auth(user.username, user.password)
          .expect(200);
        await supertest
          .get('/s/space_1/api/kibana/settings')
          .auth(user.username, user.password)
          .expect(200);
      });
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.exists.statusCode}`, async () => {
        return supertest
          .delete(`${getUrlPrefix(spaceId)}/api/spaces/space/space_2`)
          .auth(user.username, user.password)
          .expect(tests.exists.statusCode)
          .then(tests.exists.response);
      });

      describe(`when the space is reserved`, async () => {
        it(`should return ${tests.reservedSpace.statusCode}`, async () => {
          return supertest
            .delete(`${getUrlPrefix(spaceId)}/api/spaces/space/default`)
            .auth(user.username, user.password)
            .expect(tests.reservedSpace.statusCode)
            .then(tests.reservedSpace.response);
        });
      });

      describe(`when the space doesn't exist`, () => {
        it(`should return ${tests.doesntExist.statusCode}`, async () => {
          return supertest
            .delete(`${getUrlPrefix(spaceId)}/api/spaces/space/space_3`)
            .auth(user.username, user.password)
            .expect(tests.doesntExist.statusCode)
            .then(tests.doesntExist.response);
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
