/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getIdPrefix, getUrlPrefix } from './lib/space_test_utils';
import { SPACES } from './lib/spaces';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get', () => {

    const expectResults = (spaceId) => () => (resp) => {
      const expectedBody = {
        id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
        type: 'visualization',
        updated_at: '2017-09-21T18:51:23.794Z',
        version: resp.body.version,

        attributes: {
          title: 'Count of requests',
          description: '',
          version: 1,
          // cheat for some of the more complex attributes
          visState: resp.body.attributes.visState,
          uiStateJSON: resp.body.attributes.uiStateJSON,
          kibanaSavedObjectMeta: resp.body.attributes.kibanaSavedObjectMeta
        }
      };

      expect(resp.body).to.eql(expectedBody);
    };

    const expectNotFound = (type, id) => (resp) => {
      expect(resp.body).to.eql({
        error: 'Not Found',
        message: `Saved object [${type}/${id}] not found`,
        statusCode: 404,
      });
    };

    const getTest = (description, { spaceId, tests, otherSpaceId = spaceId }) => {
      describe(description, () => {
        before(async () => esArchiver.load(`saved_objects/spaces`));
        after(async () => esArchiver.unload(`saved_objects/spaces`));

        it(`should return ${tests.exists.statusCode}`, async () => {
          const objectId = `${getIdPrefix(otherSpaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`;

          return supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/visualization/${objectId}`)
            .expect(tests.exists.statusCode)
            .then(tests.exists.response('visualization', objectId));
        });
      });
    };

    getTest(`can access objects belonging to the current space (space_1)`, {
      ...SPACES.SPACE_1,
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults(SPACES.SPACE_1.spaceId),
        },
      }
    });

    getTest(`cannot access objects belonging to a different space (space_1)`, {
      ...SPACES.SPACE_1,
      otherSpaceId: SPACES.SPACE_2.spaceId,
      tests: {
        exists: {
          statusCode: 404,
          response: expectNotFound
        },
      }
    });

    getTest(`can access objects belonging to the current space (default)`, {
      ...SPACES.DEFAULT,
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults(SPACES.DEFAULT.spaceId),
        },
      }
    });

    getTest(`cannot access objects belonging to a different space (default)`, {
      ...SPACES.DEFAULT,
      otherSpaceId: SPACES.SPACE_1.spaceId,
      tests: {
        exists: {
          statusCode: 404,
          response: expectNotFound
        },
      }
    });
  });
}
