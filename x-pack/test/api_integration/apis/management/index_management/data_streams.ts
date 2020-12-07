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

  const assertDataStreamStorageSizeExists = (storageSize: string) => {
    // Storage size of a document doesn't like it would be deterministic (could vary depending
    // on how ES, Lucene, and the file system interact), so we'll just assert its presence and
    // type.
    expect(storageSize).to.be.ok();
    expect(typeof storageSize).to.be('string');
  };

  describe('Data streams', function () {
    describe('Get', () => {
      const defaultHiddenDataStream = {
        name: 'ilm-history-5',
        timeStampField: { name: '@timestamp' },
        indices: [{ name: '.ds-ilm-history-5-000001', uuid: 'generated-by-elasticsearch' }],
        generation: 1,
        health: 'green',
        indexTemplateName: 'ilm-history',
        ilmPolicyName: 'ilm-history-ilm-policy',
        _meta: { description: 'index template for ILM history indices', managed: true },
        privileges: { delete_index: true },
        hidden: true,
      };

      const testDataStreamName = 'test-data-stream';

      before(async () => await createDataStream(testDataStreamName));
      after(async () => await deleteDataStream(testDataStreamName));

      it('returns an array of all data streams (including hidden data streams)', async () => {
        const { body: dataStreams } = await supertest
          .get(`${API_BASE_PATH}/data_streams`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        // ES determines these values so we'll just echo them back.
        const { name: hiddenDsIndexName, uuid: hiddenDsIndexUuid } = dataStreams[0].indices[0];
        const { name: indexName, uuid } = dataStreams[1].indices[0];

        expect(dataStreams).to.eql([
          {
            ...defaultHiddenDataStream,
            indices: [
              {
                name: hiddenDsIndexName,
                uuid: hiddenDsIndexUuid,
              },
            ],
          },
          {
            name: testDataStreamName,
            privileges: {
              delete_index: true,
            },
            timeStampField: { name: '@timestamp' },
            indices: [
              {
                name: indexName,
                uuid,
              },
            ],
            generation: 1,
            health: 'yellow',
            indexTemplateName: testDataStreamName,
            hidden: false,
          },
        ]);
      });

      it('includes stats when provided the includeStats query parameter', async () => {
        const { body: dataStreams } = await supertest
          .get(`${API_BASE_PATH}/data_streams?includeStats=true`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        // ES determines these values so we'll just echo them back.
        // dataStreams[0] is a hidden data stream created by ES
        const { name: indexName, uuid } = dataStreams[1].indices[0];
        const { storageSize, ...dataStreamWithoutStorageSize } = dataStreams[1];
        assertDataStreamStorageSizeExists(storageSize);

        expect(dataStreams.length).to.be(2);

        expect(dataStreamWithoutStorageSize).to.eql({
          name: testDataStreamName,
          privileges: {
            delete_index: true,
          },
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              uuid,
            },
          ],
          generation: 1,
          health: 'yellow',
          indexTemplateName: testDataStreamName,
          maxTimeStamp: 0,
          hidden: false,
        });
      });

      it('returns a single data stream by ID', async () => {
        const { body: dataStream } = await supertest
          .get(`${API_BASE_PATH}/data_streams/${testDataStreamName}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        // ES determines these values so we'll just echo them back.
        const { name: indexName, uuid } = dataStream.indices[0];
        const { storageSize, ...dataStreamWithoutStorageSize } = dataStream;
        assertDataStreamStorageSizeExists(storageSize);

        expect(dataStreamWithoutStorageSize).to.eql({
          name: testDataStreamName,
          privileges: {
            delete_index: true,
          },
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              uuid,
            },
          ],
          generation: 1,
          health: 'yellow',
          indexTemplateName: testDataStreamName,
          maxTimeStamp: 0,
          hidden: false,
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
