/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SPACES } from '../lib/spaces';
import { getUrlPrefix } from '../lib/space_test_utils';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get', () => {

    const allSpaces = [
      { id: 'default',
        name: 'Default Space',
        description: 'This is the default space',
        _reserved: true },
      { id: 'space_1',
        name: 'Space 1',
        description: 'This is the first test space' },
      { id: 'space_2',
        name: 'Space 2',
        description: 'This is the second test space' }
    ];

    const createExpectResultSpace = (spaceId) => (resp) => {
      const result = allSpaces.find(space => space.id === spaceId);
      expect(resp.body).to.eql(result);
    };

    //todo: Add 404 test
    const getTest = (description, { currentSpace, spaceId, tests }) => {
      describe(description, () => {
        before(async () => esArchiver.load(`saved_objects/spaces`));
        after(async () => esArchiver.unload(`saved_objects/spaces`));

        it(`should return ${tests.exists.statusCode}`, async () => {
          return supertest
            .get(`${getUrlPrefix(currentSpace.id)}/api/spaces/v1/space/${spaceId}`)
            .expect(tests.exists.statusCode)
            .then(tests.exists.response);
        });
      });
    };

    getTest(`can access default space from default space`, {
      currentSpace: SPACES.DEFAULT,
      spaceId: SPACES.DEFAULT.spaceId,
      tests: {
        exists: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.DEFAULT.spaceId),
        },
      }
    });

    getTest(`can access space_1 from the default space`, {
      currentSpace: SPACES.DEFAULT,
      spaceId: SPACES.SPACE_1.spaceId,
      tests: {
        exists: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.SPACE_1.spaceId),
        },
      }
    });

    getTest(`can access space_2 from space_1`, {
      currentSpace: SPACES.SPACE_1,
      spaceId: SPACES.SPACE_2.spaceId,
      tests: {
        exists: {
          statusCode: 200,
          response: createExpectResultSpace(SPACES.SPACE_2.spaceId),
        },
      }
    });
  });
}
