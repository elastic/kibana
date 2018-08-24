/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getUrlPrefix } from './lib/space_test_utils';
import { SPACES } from './lib/spaces';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('create', () => {
    const expectSpaceAwareResults = (spaceId) => async (resp) => {
      expect(resp.body).to.have.property('id').match(/^[0-9a-f-]{36}$/);

      // loose ISO8601 UTC time with milliseconds validation
      expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

      expect(resp.body).to.eql({
        id: resp.body.id,
        type: 'visualization',
        updated_at: resp.body.updated_at,
        version: 1,
        attributes: {
          title: 'My favorite vis'
        }
      });

      const expectedSpacePrefix = spaceId === DEFAULT_SPACE_ID ? '' : `${spaceId}:`;

      // query ES directory to assert on space id
      const { _source } = await es.get({
        id: `${expectedSpacePrefix}visualization:${resp.body.id}`,
        type: 'doc',
        index: '.kibana'
      });

      const {
        namespace: actualSpaceId = '**not defined**'
      } = _source;

      if (spaceId === DEFAULT_SPACE_ID) {
        expect(actualSpaceId).to.eql('**not defined**');
      } else {
        expect(actualSpaceId).to.eql(spaceId);
      }
    };

    const expectNotSpaceAwareResults = () => async (resp) => {
      expect(resp.body).to.have.property('id').match(/^[0-9a-f-]{36}$/);

      // loose ISO8601 UTC time with milliseconds validation
      expect(resp.body).to.have.property('updated_at').match(/^[\d-]{10}T[\d:\.]{12}Z$/);

      expect(resp.body).to.eql({
        id: resp.body.id,
        type: 'space',
        updated_at: resp.body.updated_at,
        version: 1,
        attributes: {
          name: 'My favorite space',
        }
      });

      // query ES directory to assert on space id
      const { _source } = await es.get({
        id: `space:${resp.body.id}`,
        type: 'doc',
        index: '.kibana'
      });

      const {
        namespace: actualSpaceId = '**not defined**'
      } = _source;

      expect(actualSpaceId).to.eql('**not defined**');
    };

    const createTest = (description, { spaceId, tests }) => {
      describe(description, () => {
        before(() => esArchiver.load('saved_objects/spaces'));
        after(() => esArchiver.unload('saved_objects/spaces'));
        it(`should return ${tests.spaceAware.statusCode} for a space-aware type`, async () => {
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/visualization`)
            .send({
              attributes: {
                title: 'My favorite vis'
              }
            })
            .expect(tests.spaceAware.statusCode)
            .then(tests.spaceAware.response);
        });

        it(`should return ${tests.notSpaceAware.statusCode} for a non space-aware type`, async () => {
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/space`)
            .send({
              attributes: {
                name: 'My favorite space',
              }
            })
            .expect(tests.notSpaceAware.statusCode)
            .then(tests.notSpaceAware.response);
        });

      });
    };

    createTest('in the current space (space_1)', {
      ...SPACES.SPACE_1,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults(SPACES.SPACE_1.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults(SPACES.SPACE_1.spaceId),
        }
      }
    });

    createTest('in the default space', {
      ...SPACES.DEFAULT,
      tests: {
        spaceAware: {
          statusCode: 200,
          response: expectSpaceAwareResults(SPACES.DEFAULT.spaceId),
        },
        notSpaceAware: {
          statusCode: 200,
          response: expectNotSpaceAwareResults(SPACES.SPACE_1.spaceId),
        }
      }
    });
  });
}
