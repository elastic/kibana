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
import { DataStream } from '../../../../../plugins/index_management/common';

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

  const assertDataStreamStorageSizeExists = (storageSize: string, storageSizeBytes: number) => {
    // Storage size of a document doesn't look like it would be deterministic (could vary depending
    // on how ES, Lucene, and the file system interact), so we'll just assert its presence and
    // type.
    expect(storageSize).to.be.ok();
    expect(typeof storageSize).to.be('string');
    expect(storageSizeBytes).to.be.ok();
    expect(typeof storageSizeBytes).to.be('number');
  };

  describe('Data streams', function () {
    describe('Get', () => {
      const testDataStreamName = 'test-data-stream';

      before(async () => await createDataStream(testDataStreamName));
      after(async () => await deleteDataStream(testDataStreamName));

      it('returns an array of data streams', async () => {
        const { body: dataStreams } = await supertest
          .get(`${API_BASE_PATH}/data_streams`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(dataStreams).to.be.an('array');

        // returned array can contain automatically created data streams
        const testDataStream = dataStreams.find(
          (dataStream: DataStream) => dataStream.name === testDataStreamName
        );

        expect(testDataStream).to.be.ok();

        // ES determines these values so we'll just echo them back.
        const { name: indexName, uuid } = testDataStream!.indices[0];

        expect(testDataStream).to.eql({
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
        });
      });

      it('includes stats when provided the includeStats query parameter', async () => {
        const { body: dataStreams } = await supertest
          .get(`${API_BASE_PATH}/data_streams?includeStats=true`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(dataStreams).to.be.an('array');

        // returned array can contain automatically created data streams
        const testDataStream = dataStreams.find(
          (dataStream: DataStream) => dataStream.name === testDataStreamName
        );

        expect(testDataStream).to.be.ok();

        // ES determines these values so we'll just echo them back.
        const { name: indexName, uuid } = testDataStream!.indices[0];
        const { storageSize, storageSizeBytes, ...dataStreamWithoutStorageSize } = testDataStream!;
        assertDataStreamStorageSizeExists(storageSize, storageSizeBytes);

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
        const { storageSize, storageSizeBytes, ...dataStreamWithoutStorageSize } = dataStream;
        assertDataStreamStorageSizeExists(storageSize, storageSizeBytes);

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
