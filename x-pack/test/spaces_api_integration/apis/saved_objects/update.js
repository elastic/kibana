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

  describe('update', () => {
    const expectSpaceAwareResults = () => resp => {

      // loose ISO8601 UTC time with milliseconds validation
      expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

      expect(resp.body).to.eql({
        id: resp.body.id,
        type: 'visualization',
        updated_at: resp.body.updated_at,
        version: 2,
        attributes: {
          title: 'My second favorite vis'
        }
      });
    };

    const expectNonSpaceAwareResults = () => resp => {

      // loose ISO8601 UTC time with milliseconds validation
      expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

      expect(resp.body).to.eql({
        id: resp.body.id,
        type: 'space',
        updated_at: resp.body.updated_at,
        version: 2,
        attributes: {
          name: 'My second favorite space'
        }
      });
    };

    const expectNotFound = (type, id) => resp => {
      expect(resp.body).eql({
        statusCode: 404,
        error: 'Not Found',
        message: `Saved object [${type}/${id}] not found`
      });
    };

    const updateTest = (description, { spaceId, tests }) => {
      describe(description, () => {
        before(() => esArchiver.load('saved_objects/spaces'));
        after(() => esArchiver.unload('saved_objects/spaces'));
        it(`should return ${tests.spaceAware.statusCode} for a space-aware doc`, async () => {
          await supertest
            .put(`${getUrlPrefix(spaceId)}/api/saved_objects/visualization/${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`)
            .send({
              attributes: {
                title: 'My second favorite vis'
              }
            })
            .expect(tests.spaceAware.statusCode)
            .then(tests.spaceAware.response());
        });

        it(`should return ${tests.notSpaceAware.statusCode} for a non space-aware doc`, async () => {
          await supertest
            .put(`${getUrlPrefix(spaceId)}/api/saved_objects/space/space_1`)
            .send({
              attributes: {
                name: 'My second favorite space'
              }
            })
            .expect(tests.notSpaceAware.statusCode)
            .then(tests.notSpaceAware.response());
        });

        it(`should return ${tests.inOtherSpace.statusCode} for a doc in another space`, async () => {
          const id = `${getIdPrefix('space_2')}dd7caf20-9efd-11e7-acb3-3dab96693fab`;
          await supertest
            .put(`${getUrlPrefix(spaceId)}/api/saved_objects/visualization/${id}`)
            .send({
              attributes: {
                title: 'My second favorite vis'
              }
            })
            .expect(tests.inOtherSpace.statusCode)
            .then(tests.inOtherSpace.response(`visualization`, `${id}`));
        });

        describe('unknown id', () => {
          it(`should return ${tests.doesntExist.statusCode}`, async () => {
            await supertest
              .put(`${getUrlPrefix(spaceId)}/api/saved_objects/visualization/not an id`)
              .send({
                attributes: {
                  title: 'My second favorite vis'
                }
              })
              .expect(tests.doesntExist.statusCode)
              .then(tests.doesntExist.response(`visualization`, `not an id`));
          });
        });
      });
    };

    updateTest(`in the default space`, {
      ...SPACES.DEFAULT,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNonSpaceAwareResults,
        },
        inOtherSpace: {
          statusCode: 404,
          response: expectNotFound,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      }
    });

    updateTest('in the current space (space_1)', {
      ...SPACES.SPACE_1,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults,
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNonSpaceAwareResults,
        },
        inOtherSpace: {
          statusCode: 404,
          response: expectNotFound,
        },
        doesntExist: {
          statusCode: 404,
          response: expectNotFound,
        },
      }
    });

  });
}
