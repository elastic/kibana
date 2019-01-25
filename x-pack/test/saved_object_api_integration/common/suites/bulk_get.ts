/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SuperTest } from 'supertest';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';
import { getIdPrefix, getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface BulkGetTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface BulkGetTests {
  default: BulkGetTest;
}

interface BulkGetTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  otherSpaceId?: string;
  tests: BulkGetTests;
}

const createBulkRequests = (spaceId: string) => [
  {
    type: 'visualization',
    id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
  },
  {
    type: 'dashboard',
    id: `${getIdPrefix(spaceId)}does not exist`,
  },
  {
    type: 'globaltype',
    id: '8121a00-8efd-21e7-1cb3-34ab966434445',
  },
];

export function bulkGetTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectNotFoundResults = (spaceId: string) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      saved_objects: [
        {
          id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
          type: 'visualization',
          error: {
            statusCode: 404,
            message: 'Not found',
          },
        },
        {
          id: `${getIdPrefix(spaceId)}does not exist`,
          type: 'dashboard',
          error: {
            statusCode: 404,
            message: 'Not found',
          },
        },
        {
          id: `8121a00-8efd-21e7-1cb3-34ab966434445`,
          type: 'globaltype',
          updated_at: '2017-09-21T18:59:16.270Z',
          version: resp.body.saved_objects[2].version,
          attributes: {
            name: 'My favorite global object',
          },
          references: [],
        },
      ],
    });
  };

  const expectRbacForbidden = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to bulk_get dashboard,globaltype,visualization, missing action:saved_objects/dashboard/bulk_get,action:saved_objects/globaltype/bulk_get,action:saved_objects/visualization/bulk_get`,
    });
  };

  const createExpectResults = (spaceId = DEFAULT_SPACE_ID) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      saved_objects: [
        {
          id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
          type: 'visualization',
          migrationVersion: {
            visualization: '7.0.0',
          },
          updated_at: '2017-09-21T18:51:23.794Z',
          version: resp.body.saved_objects[0].version,
          attributes: {
            title: 'Count of requests',
            description: '',
            version: 1,
            // cheat for some of the more complex attributes
            visState: resp.body.saved_objects[0].attributes.visState,
            uiStateJSON: resp.body.saved_objects[0].attributes.uiStateJSON,
            kibanaSavedObjectMeta: resp.body.saved_objects[0].attributes.kibanaSavedObjectMeta,
          },
          references: [
            {
              name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
              type: 'index-pattern',
              id: `${getIdPrefix(spaceId)}91200a00-9efd-11e7-acb3-3dab96693fab`,
            },
          ],
        },
        {
          id: `${getIdPrefix(spaceId)}does not exist`,
          type: 'dashboard',
          error: {
            statusCode: 404,
            message: 'Not found',
          },
        },
        {
          id: `8121a00-8efd-21e7-1cb3-34ab966434445`,
          type: 'globaltype',
          updated_at: '2017-09-21T18:59:16.270Z',
          version: resp.body.saved_objects[2].version,
          attributes: {
            name: 'My favorite global object',
          },
          references: [],
        },
      ],
    });
  };

  const makeBulkGetTest = (describeFn: DescribeFn) => (
    description: string,
    definition: BulkGetTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, otherSpaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.default.statusCode}`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_bulk_get`)
          .auth(user.username, user.password)
          .send(createBulkRequests(otherSpaceId || spaceId))
          .expect(tests.default.statusCode)
          .then(tests.default.response);
      });
    });
  };

  const bulkGetTest = makeBulkGetTest(describe);
  // @ts-ignore
  bulkGetTest.only = makeBulkGetTest(describe.only);

  return {
    bulkGetTest,
    createExpectNotFoundResults,
    createExpectResults,
    expectRbacForbidden,
  };
}
