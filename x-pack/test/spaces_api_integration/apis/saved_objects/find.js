/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SPACES } from '../lib/spaces';
import { getIdPrefix, getUrlPrefix } from '../lib/space_test_utils';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('find', () => {

    const expectVisualizationResults = (spaceId) => (resp) => {
      expect(resp.body).to.eql({
        page: 1,
        per_page: 20,
        total: 1,
        saved_objects: [
          {
            type: 'visualization',
            id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
            // no space id on the saved object because the field is not requested as part of a find operation
            version: 1,
            attributes: {
              'title': 'Count of requests'
            }
          }
        ]
      });
    };

    const expectAllResults = (spaceId) => (resp) => {
      // TODO(legrego): update once config is space-aware

      const sortById = ({ id: id1 }, { id: id2 }) => id1 < id2 ? -1 : 1;

      resp.body.saved_objects.sort(sortById);

      const expectedSavedObjects = [{
        id: '7.0.0-alpha1',
        type: 'config',
        updated_at: '2017-09-21T18:49:16.302Z',
        version: 1,
      },
      {
        id: `${getIdPrefix(spaceId)}91200a00-9efd-11e7-acb3-3dab96693fab`,
        type: 'index-pattern',
        updated_at: '2017-09-21T18:49:16.270Z',
        version: 1,
      },

      {
        id: `${getIdPrefix(spaceId)}be3733a0-9efe-11e7-acb3-3dab96693fab`,
        type: 'dashboard',
        updated_at: '2017-09-21T18:57:40.826Z',
        version: 1,
      },
      {
        id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
        type: 'visualization',
        updated_at: '2017-09-21T18:51:23.794Z',
        version: 1,
      }]
        .sort(sortById);

      expectedSavedObjects.forEach((object, index) => {
        if (resp.body.saved_objects[index]) {
          object.attributes = resp.body.saved_objects[index].attributes;
        }
      });

      expect(resp.body).to.eql({
        page: 1,
        per_page: 20,
        total: expectedSavedObjects.length,
        saved_objects: expectedSavedObjects,
      });
    };

    const createExpectEmpty = (page, perPage, total) => (resp) => {
      expect(resp.body).to.eql({
        page: page,
        per_page: perPage,
        total: total,
        saved_objects: []
      });
    };

    const findTest = (description, { spaceId, tests }) => {
      describe(description, () => {
        before(() => esArchiver.load('saved_objects/spaces'));
        after(() => esArchiver.unload('saved_objects/spaces'));

        it(`should return ${tests.normal.statusCode} with ${tests.normal.description}`, async () => (
          await supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=visualization&fields=title`)
            .expect(tests.normal.statusCode)
            .then(tests.normal.response)
        ));

        describe('page beyond total', () => {
          it(`should return ${tests.pageBeyondTotal.statusCode} with ${tests.pageBeyondTotal.description}`, async () => (
            await supertest
              .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=visualization&page=100&per_page=100`)
              .expect(tests.pageBeyondTotal.statusCode)
              .then(tests.pageBeyondTotal.response)
          ));
        });

        describe('unknown search field', () => {
          it(`should return ${tests.unknownSearchField.statusCode} with ${tests.unknownSearchField.description}`, async () => (
            await supertest
              .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=wigwags&search_fields=a`)
              .expect(tests.unknownSearchField.statusCode)
              .then(tests.unknownSearchField.response)
          ));
        });

        describe('no type', () => {
          it(`should return ${tests.noType.statusCode} with ${tests.noType.description}`, async () => (
            await supertest
              .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find`)
              .expect(tests.noType.statusCode)
              .then(tests.noType.response)
          ));
        });
      });
    };

    findTest(`objects only within the current space (space_1)`, {
      ...SPACES.SPACE_1,
      tests: {
        normal: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectVisualizationResults(SPACES.SPACE_1.spaceId),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'all objects',
          statusCode: 200,
          response: expectAllResults(SPACES.SPACE_1.spaceId),
        },
      }
    });

    findTest(`objects only within the current space (default)`, {
      ...SPACES.DEFAULT,
      tests: {
        normal: {
          description: 'only the visualization',
          statusCode: 200,
          response: expectVisualizationResults(SPACES.DEFAULT.spaceId),
        },
        pageBeyondTotal: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(100, 100, 1),
        },
        unknownSearchField: {
          description: 'empty result',
          statusCode: 200,
          response: createExpectEmpty(1, 20, 0),
        },
        noType: {
          description: 'all objects',
          statusCode: 200,
          response: expectAllResults(SPACES.DEFAULT.spaceId),
        },
      }
    });
  });
}
