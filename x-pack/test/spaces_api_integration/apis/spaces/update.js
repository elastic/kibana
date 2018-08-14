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

  describe('update', () => {
    const createExpectResult = expectedResult => resp => {
      expect(resp.body).to.eql(expectedResult);
    };

    const createExpectNotFound = spaceId => resp => {
      expect(resp.body).to.eql({
        error: 'Not Found',
        statusCode: 404,
        message: `Saved object [space/${spaceId}] not found`
      });
    };

    const updateTest = (description, { currentSpace, tests }) => {
      describe(description, () => {
        before(async () => esArchiver.load(`saved_objects/spaces`));
        after(async () => esArchiver.unload(`saved_objects/spaces`));

        it(`should return ${tests.alreadyExists.statusCode}`, async () => {
          return supertest
            .put(`${getUrlPrefix(currentSpace.id)}/api/spaces/v1/space/${tests.alreadyExists.space.id}`)
            .send(tests.alreadyExists.space)
            .expect(tests.alreadyExists.statusCode)
            .then(tests.alreadyExists.response);
        });

        describe(`when space doesn't exist`, () => {
          it(`should return ${tests.newSpace.statusCode}`, async () => {
            return supertest
              .put(`${getUrlPrefix(currentSpace.id)}/api/spaces/v1/space/${tests.newSpace.space.id}`)
              .send(tests.newSpace.space)
              .expect(tests.newSpace.statusCode)
              .then(tests.newSpace.response);
          });
        });
      });
    };

    updateTest(`from the default space`, {
      currentSpace: SPACES.DEFAULT,
      tests: {
        alreadyExists: {
          space: {
            name: 'space 1',
            id: 'space_1',
            description: 'a description',
            color: '#5c5959',
            _reserved: true,
          },
          statusCode: 200,
          response: createExpectResult({
            name: 'space 1',
            id: 'space_1',
            description: 'a description',
            color: '#5c5959',
          }),
        },
        newSpace: {
          space: {
            name: 'marketing',
            id: 'marketing',
            description: 'a description',
            color: '#5c5959',
          },
          statusCode: 404,
          response: createExpectNotFound('marketing'),
        },
      },
    });

    updateTest(`from space_1`, {
      currentSpace: SPACES.SPACE_1,
      tests: {
        alreadyExists: {
          space: {
            name: 'space 1',
            id: 'space_1',
            description: 'a description',
            color: '#5c5959',
            _reserved: true,
          },
          statusCode: 200,
          response: createExpectResult({
            name: 'space 1',
            id: 'space_1',
            description: 'a description',
            color: '#5c5959',
          }),
        },
        newSpace: {
          space: {
            name: 'marketing',
            id: 'marketing',
            description: 'a description',
            color: '#5c5959',
          },
          statusCode: 404,
          response: createExpectNotFound('marketing'),
        },
      },
    });
  });
}
