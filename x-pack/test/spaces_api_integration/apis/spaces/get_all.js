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

  describe('get all', () => {

    const expectResults = (resp) => {
      const expectedBody = [
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
      expect(resp.body).to.eql(expectedBody);
    };

    const getTest = (description, { spaceId, tests }) => {
      describe(description, () => {
        before(async () => esArchiver.load(`saved_objects/spaces`));
        after(async () => esArchiver.unload(`saved_objects/spaces`));

        it(`should return ${tests.exists.statusCode}`, async () => {
          return supertest
            .get(`${getUrlPrefix(spaceId)}/api/spaces/v1/spaces`)
            .expect(tests.exists.statusCode)
            .then(tests.exists.response);
        });
      });
    };

    getTest(`can access all spaces from space_1`, {
      ...SPACES.SPACE_1,
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults,
        },
      }
    });

    getTest(`can access all spaces from the default space`, {
      ...SPACES.DEFAULT,
      tests: {
        exists: {
          statusCode: 200,
          response: expectResults,
        },
      }
    });
  });
}
