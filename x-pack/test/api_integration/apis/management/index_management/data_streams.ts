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
    return es.dataManagement
      .saveComposableIndexTemplate({
        name,
        body: {
          // We need to match the names of backing indices with this template
          index_patterns: [name + '*'],
          template: {
            mappings: {
              properties: {
                '@timestamp': {
                  type: 'date',
                },
              },
            },
          },
          data_stream: {
            timestamp_field: '@timestamp',
          },
        },
      })
      .then(() =>
        es.dataManagement.createDataStream({
          name,
        })
      );
  };

  const deleteDataStream = (name: string) => {
    return es.dataManagement
      .deleteDataStream({
        name,
      })
      .then(() =>
        es.dataManagement.deleteComposableIndexTemplate({
          name,
        })
      );
  };

  // Unskip once ES snapshot has been promoted that updates the data stream response
  describe.skip('Data streams', function () {
    const testDataStreamName = 'test-data-stream';

    describe('Get', () => {
      before(async () => await createDataStream(testDataStreamName));
      after(async () => await deleteDataStream(testDataStreamName));

      describe('all data streams', () => {
        it('returns an array of data streams', async () => {
          const { body: dataStreams } = await supertest
            .get(`${API_BASE_PATH}/data_streams`)
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          // ES determines these values so we'll just echo them back.
          const { name: indexName, uuid } = dataStreams[0].indices[0];
          expect(dataStreams).to.eql([
            {
              name: testDataStreamName,
              timeStampField: { name: '@timestamp', mapping: { type: 'date' } },
              indices: [
                {
                  name: indexName,
                  uuid,
                },
              ],
              generation: 1,
            },
          ]);
        });
      });
    });
  });
}
