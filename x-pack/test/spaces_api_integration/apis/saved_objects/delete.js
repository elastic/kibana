/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SPACES } from './lib/spaces';
import { getUrlPrefix, getIdPrefix } from './lib/space_test_utils';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('delete', () => {

    const expectEmpty = (resp) => {
      expect(resp.body).to.eql({});
    };

    const expectNotFound = (resp) => {
      expect(resp.body).to.eql({
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found'
      });
    };

    const deleteTest = (description, { urlContext, spaceId, tests }) => {
      describe(description, () => {
        before(() => esArchiver.load('saved_objects/spaces'));
        after(() => esArchiver.unload('saved_objects/spaces'));

        it(`should return ${tests.spaceAware.statusCode} when deleting a space-aware doc`, async () => (
          await supertest
            .delete(`${getUrlPrefix(urlContext)}/api/saved_objects/dashboard/${getIdPrefix(spaceId)}be3733a0-9efe-11e7-acb3-3dab96693fab`)
            .expect(tests.spaceAware.statusCode)
            .then(tests.spaceAware.response)
        ));

        it(`should return ${tests.notSpaceAware.statusCode} when deleting a non-space-aware doc`, async () => (
          await supertest
            .delete(`${getUrlPrefix(urlContext)}/api/saved_objects/space/space_2`)
            .expect(tests.notSpaceAware.statusCode)
            .then(tests.notSpaceAware.response)
        ));

        it(`should return ${tests.inOtherSpace.statusCode} when deleting a doc belonging to another space`, async () => {
          await supertest
            .delete(`${getUrlPrefix(urlContext)}/api/saved_objects/dashboard/${getIdPrefix('space_2')}be3733a0-9efe-11e7-acb3-3dab96693fab`)
            .expect(tests.inOtherSpace.statusCode)
            .then(tests.inOtherSpace.response);
        });
      });
    };

    deleteTest(`in the default space`, {
      ...SPACES.DEFAULT,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectEmpty
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectEmpty
        },
        inOtherSpace: {
          statusCode: 404,
          response: expectNotFound
        }
      }
    });

    deleteTest(`in the current space (space_1)`, {
      ...SPACES.SPACE_1,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectEmpty
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectEmpty
        },
        inOtherSpace: {
          statusCode: 404,
          response: expectNotFound
        }
      }
    });
  });
}
