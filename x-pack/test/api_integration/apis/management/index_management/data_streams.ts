/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
// @ts-ignore
import { API_BASE_PATH } from './constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  const createDataStream = (name: string) => {
    // A data stream requires an index template before it can be created.
    return supertest
      .post(`${API_BASE_PATH}/index-templates`)
      .set('kbn-xsrf', 'xxx')
      .send({
        name,
        indexPatterns: ['*'],
        _kbnMeta: {
          isLegacy: false,
        },
      })
      .then(() =>
        es.dataManagement.createDataStream({
          name,
        })
      );
  };

  const deleteDataStream = (name: string) => {
    return supertest
      .post(`${API_BASE_PATH}/delete-index-templates`)
      .set('kbn-xsrf', 'xxx')
      .send({
        templates: [{ name, isLegacy: false }],
      })
      .then(() =>
        es.dataManagement.deleteDataStream({
          name,
        })
      );
  };

  describe('Data streams', function () {
    // TODO: Implement this test once the API supports creating composable index templates.
    describe.skip('Get', () => {
      before(() => createDataStream('test-data-stream'));
      after(() => deleteDataStream('test-data-stream'));

      describe('all data streams', () => {
        it('returns an array of data streams', async () => {
          const { body: dataStreams } = await supertest
            .get(`${API_BASE_PATH}/data_streams`)
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          expect(dataStreams).to.eql([
            {
              name: 'test-data-stream',
            },
          ]);
        });
      });
    });
  });
}
