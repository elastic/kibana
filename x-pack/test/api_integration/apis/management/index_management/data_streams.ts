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

  const createDataStream = async (name: string) => {
    // A data stream requires an index template before it can be created.
    await es.dataManagement.saveComposableIndexTemplate({
      name,
      body: {
        // We need to match the names of backing indices with this template.
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
        data_stream: {},
      },
    });

    await es.dataManagement.createDataStream({ name });
  };

  const deleteComposableIndexTemplate = async (name: string) => {
    await es.dataManagement.deleteComposableIndexTemplate({ name });
  };

  const deleteDataStream = async (name: string) => {
    await es.dataManagement.deleteDataStream({ name });
    await deleteComposableIndexTemplate(name);
  };

  describe('Data streams', function () {
    describe('Get', () => {
      const testDataStreamName = 'test-data-stream';

      before(async () => await createDataStream(testDataStreamName));
      after(async () => await deleteDataStream(testDataStreamName));

      it('returns an array of all data streams', async () => {
        const { body: dataStreams } = await supertest
          .get(`${API_BASE_PATH}/data_streams`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        // ES determines these values so we'll just echo them back.
        const { name: indexName, uuid } = dataStreams[0].indices[0];
        expect(dataStreams).to.eql([
          {
            name: testDataStreamName,
            timeStampField: { name: '@timestamp' },
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

      it('returns a single data stream by ID', async () => {
        const { body: dataStream } = await supertest
          .get(`${API_BASE_PATH}/data_streams/${testDataStreamName}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        // ES determines these values so we'll just echo them back.
        const { name: indexName, uuid } = dataStream.indices[0];
        expect(dataStream).to.eql({
          name: testDataStreamName,
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              uuid,
            },
          ],
          generation: 1,
        });
      });
    });

    describe('Delete', () => {
      const testDataStreamName1 = 'test-data-stream1';
      const testDataStreamName2 = 'test-data-stream2';

      before(async () => {
        await Promise.all([
          createDataStream(testDataStreamName1),
          createDataStream(testDataStreamName2),
        ]);
      });

      after(async () => {
        // The Delete API only deletes the data streams, so we still need to manually delete their
        // related index patterns to clean up.
        await Promise.all([
          deleteComposableIndexTemplate(testDataStreamName1),
          deleteComposableIndexTemplate(testDataStreamName2),
        ]);
      });

      it('deletes multiple data streams', async () => {
        await supertest
          .post(`${API_BASE_PATH}/delete_data_streams`)
          .set('kbn-xsrf', 'xxx')
          .send({
            dataStreams: [testDataStreamName1, testDataStreamName2],
          })
          .expect(200);

        await supertest
          .get(`${API_BASE_PATH}/data_streams/${testDataStreamName1}`)
          .set('kbn-xsrf', 'xxx')
          .expect(404);

        await supertest
          .get(`${API_BASE_PATH}/data_streams/${testDataStreamName2}`)
          .set('kbn-xsrf', 'xxx')
          .expect(404);
      });
    });
  });
}
