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

  describe('delete', () => {
    const expectEmptyResponse = resp => {
      expect(resp.body).to.eql('');
    };

    const expectNotFound = resp => {
      expect(resp.body).to.eql({
        error: 'Not Found',
        statusCode: 404,
        message: `Saved object [space/space_3] not found`
      });
    };

    const expectReservedSpaceResponse = resp => {
      expect(resp.body).to.eql({
        error: 'Bad Request',
        statusCode: 400,
        message: `This Space cannot be deleted because it is reserved.`
      });
    };

    const deleteTest = (description, { currentSpace, tests }) => {
      describe(description, () => {
        before(async () => esArchiver.load(`saved_objects/spaces`));
        after(async () => esArchiver.unload(`saved_objects/spaces`));

        it(`should return ${tests.exists.statusCode}`, async () => {
          return supertest
            .delete(`${getUrlPrefix(currentSpace.id)}/api/spaces/v1/space/${SPACES.SPACE_1.spaceId}`)
            .expect(tests.exists.statusCode)
            .then(tests.exists.response);
        });

        describe(`when the space is the default space`, async () => {
          it(`should return ${tests.defaultSpace.statusCode}`, async () => {
            return supertest
              .delete(`${getUrlPrefix(currentSpace.id)}/api/spaces/v1/space/${SPACES.DEFAULT.spaceId}`)
              .expect(tests.defaultSpace.statusCode)
              .then(tests.defaultSpace.response);
          });
        });

        describe(`when the space doesn't exist`, () => {
          it(`should return ${tests.doesntExist.statusCode}`, async () => {
            return supertest
              .delete(`${getUrlPrefix(currentSpace.id)}/api/spaces/v1/space/space_3`)
              .expect(tests.doesntExist.statusCode)
              .then(tests.doesntExist.response);
          });
        });
      });
    };

    deleteTest(`from the default space`, {
      currentSpace: SPACES.DEFAULT,
      tests: {
        exists: {
          statusCode: 204,
          response: expectEmptyResponse,
        },
        defaultSpace: {
          statusCode: 400,
          response: expectReservedSpaceResponse,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      },
    });

    deleteTest(`from space_1`, {
      currentSpace: SPACES.SPACE_1,
      tests: {
        exists: {
          statusCode: 204,
          response: expectEmptyResponse,
        },
        defaultSpace: {
          statusCode: 400,
          response: expectReservedSpaceResponse,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      },
    });
  });
}
