/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SPACES } from './lib/spaces';
import { getIdPrefix, getUrlPrefix } from './lib/space_test_utils';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const BULK_REQUESTS = [
    {
      type: 'visualization',
      id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab',
    },
    {
      type: 'dashboard',
      id: 'does not exist',
    },
    {
      type: 'config',
      id: '7.0.0-alpha1',
    },
  ];

  const createBulkRequests = (spaceId) => BULK_REQUESTS.map(r => ({
    ...r,
    id: `${getIdPrefix(spaceId)}${r.id}`
  }));

  describe('_bulk_get', () => {
    const expectNotFoundResults = (spaceId) => resp => {
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
          //todo(legrego) fix when config is space aware
          {
            id: `${getIdPrefix(spaceId)}7.0.0-alpha1`,
            type: 'config',
            error: {
              statusCode: 404,
              message: 'Not found',
            },
          },
        ],
      });
    };

    const expectResults = (spaceId) => resp => {
      expect(resp.body).to.eql({
        saved_objects: [
          {
            id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
            type: 'visualization',
            updated_at: '2017-09-21T18:51:23.794Z',
            version: resp.body.saved_objects[0].version,
            attributes: {
              title: 'Count of requests',
              description: '',
              version: 1,
              // cheat for some of the more complex attributes
              visState: resp.body.saved_objects[0].attributes.visState,
              uiStateJSON: resp.body.saved_objects[0].attributes.uiStateJSON,
              kibanaSavedObjectMeta:
                resp.body.saved_objects[0].attributes.kibanaSavedObjectMeta,
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
          //todo(legrego) fix when config is space aware
          {
            id: `${getIdPrefix(spaceId)}7.0.0-alpha1`,
            type: 'config',
            error: {
              statusCode: 404,
              message: 'Not found',
            },
          },
        ],
      });
    };

    const bulkGetTest = (description, { spaceId, tests, otherSpaceId = spaceId }) => {
      describe(description, () => {
        before(() => esArchiver.load('saved_objects/spaces'));
        after(() => esArchiver.unload('saved_objects/spaces'));

        it(`should return ${tests.default.statusCode}`, async () => {
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_bulk_get`)
            .send(createBulkRequests(otherSpaceId))
            .expect(tests.default.statusCode)
            .then(tests.default.response);
        });
      });
    };

    bulkGetTest(`objects within the current space (space_1)`, {
      ...SPACES.SPACE_1,
      tests: {
        default: {
          statusCode: 200,
          response: expectResults(SPACES.SPACE_1.spaceId),
        },
      }
    });

    bulkGetTest(`objects within another space`, {
      ...SPACES.SPACE_1,
      otherSpaceId: SPACES.SPACE_2.spaceId,
      tests: {
        default: {
          statusCode: 200,
          response: expectNotFoundResults(SPACES.SPACE_2.spaceId)
        },
      }
    });

  });
}
