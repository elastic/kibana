/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DataStream } from '@kbn/index-management-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_BASE_PATH } from './constants';
import { datastreamsHelpers } from './lib/datastreams.helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  const {
    createDataStream,
    deleteDataStream,
    assertDataStreamStorageSizeExists,
    deleteComposableIndexTemplate,
    updateIndexTemplateMappings,
    getMapping,
    getDatastream,
  } = datastreamsHelpers(getService);

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
          lifecycle: {
            enabled: true,
          },
          privileges: {
            delete_index: true,
            manage_data_stream_lifecycle: true,
          },
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              uuid,
              preferILM: true,
              managedBy: 'Data stream lifecycle',
            },
          ],
          nextGenerationManagedBy: 'Data stream lifecycle',
          generation: 1,
          health: 'yellow',
          indexTemplateName: testDataStreamName,
          hidden: false,
          indexMode: 'standard',
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
            manage_data_stream_lifecycle: true,
          },
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              managedBy: 'Data stream lifecycle',
              preferILM: true,
              uuid,
            },
          ],
          generation: 1,
          health: 'yellow',
          indexTemplateName: testDataStreamName,
          nextGenerationManagedBy: 'Data stream lifecycle',
          maxTimeStamp: 0,
          hidden: false,
          lifecycle: {
            enabled: true,
          },
          indexMode: 'standard',
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
            manage_data_stream_lifecycle: true,
          },
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              managedBy: 'Data stream lifecycle',
              preferILM: true,
              uuid,
            },
          ],
          generation: 1,
          health: 'yellow',
          indexTemplateName: testDataStreamName,
          nextGenerationManagedBy: 'Data stream lifecycle',
          maxTimeStamp: 0,
          hidden: false,
          lifecycle: {
            enabled: true,
          },
          indexMode: 'standard',
        });
      });

      describe('index mode', () => {
        it('correctly returns index mode property based on index settings', async () => {
          const logsdbDataStreamName = 'logsdb-test-data-stream';
          const indexMode = 'logsdb';

          await createDataStream(logsdbDataStreamName, indexMode);

          const { body: dataStream } = await supertest
            .get(`${API_BASE_PATH}/data_streams/${logsdbDataStreamName}`)
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          expect(dataStream.indexMode).to.eql(indexMode);

          await deleteDataStream(logsdbDataStreamName);
        });

        describe('index mode of logs-*-* data streams', () => {
          const logsdbDataStreamName = 'logs-test-ds';

          before(async () => {
            await createDataStream(logsdbDataStreamName);
          });

          after(async () => {
            await deleteDataStream(logsdbDataStreamName);
          });

          const logsdbSettings: Array<{
            enabled: boolean | null;
            prior_logs_usage: boolean;
            indexMode: string;
          }> = [
            { enabled: true, prior_logs_usage: true, indexMode: 'logsdb' },
            { enabled: false, prior_logs_usage: true, indexMode: 'standard' },
            // In stateful Kibana, if prior_logs_usage is set to true, the cluster.logsdb.enabled setting is false by default, so standard index mode
            { enabled: null, prior_logs_usage: true, indexMode: 'standard' },
            // In stateful Kibana, if prior_logs_usage is set to false, the cluster.logsdb.enabled setting is true by default, so logsdb index mode
            { enabled: null, prior_logs_usage: false, indexMode: 'logsdb' },
          ];

          // eslint-disable-next-line @typescript-eslint/naming-convention
          logsdbSettings.forEach(({ enabled, prior_logs_usage, indexMode }) => {
            it(`returns ${indexMode} index mode if logsdb.enabled setting is ${enabled} and logs.prior_logs_usage is ${prior_logs_usage}`, async () => {
              await es.cluster.putSettings({
                body: {
                  persistent: {
                    cluster: {
                      logsdb: {
                        enabled,
                      },
                    },
                    logsdb: {
                      prior_logs_usage,
                    },
                  },
                },
              });

              const { body: dataStream } = await supertest
                .get(`${API_BASE_PATH}/data_streams/${logsdbDataStreamName}`)
                .set('kbn-xsrf', 'xxx')
                .expect(200);

              expect(dataStream.indexMode).to.eql(indexMode);
            });
          });
        });
      });
    });

    describe('Update', () => {
      const testDataStreamName1 = 'test-data-stream1';
      const testDataStreamName2 = 'test-data-stream2';

      before(async () => {
        await createDataStream(testDataStreamName1);
        await createDataStream(testDataStreamName2);
      });
      after(async () => {
        await deleteDataStream(testDataStreamName1);
        await deleteDataStream(testDataStreamName2);
      });

      it('updates the data retention of a DS', async () => {
        const { body } = await supertest
          .put(`${API_BASE_PATH}/data_streams/data_retention`)
          .set('kbn-xsrf', 'xxx')
          .send({
            dataRetention: '7d',
            dataStreams: [testDataStreamName1],
          })
          .expect(200);

        expect(body).to.eql({ success: true });
      });

      it('updates the data retention of multiple DS', async () => {
        const { body } = await supertest
          .put(`${API_BASE_PATH}/data_streams/data_retention`)
          .set('kbn-xsrf', 'xxx')
          .send({
            dataRetention: '7d',
            dataStreams: [testDataStreamName1, testDataStreamName2],
          })
          .expect(200);

        expect(body).to.eql({ success: true });
      });

      it('sets data retention to infinite', async () => {
        const { body } = await supertest
          .put(`${API_BASE_PATH}/data_streams/data_retention`)
          .set('kbn-xsrf', 'xxx')
          .send({
            dataStreams: [testDataStreamName1],
          })
          .expect(200);

        expect(body).to.eql({ success: true });
      });

      it('can disable lifecycle for a given policy', async () => {
        const { body } = await supertest
          .put(`${API_BASE_PATH}/data_streams/data_retention`)
          .set('kbn-xsrf', 'xxx')
          .send({ enabled: false, dataStreams: [testDataStreamName1] })
          .expect(200);

        expect(body).to.eql({ success: true });

        const datastream = await getDatastream(testDataStreamName1);
        expect(datastream.lifecycle).to.be(undefined);
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

    describe('Mappings from template', () => {
      const testDataStreamName1 = 'test-data-stream-mappings-1';

      before(async () => {
        await createDataStream(testDataStreamName1);
      });

      after(async () => {
        await deleteDataStream(testDataStreamName1);
      });

      it('Apply mapping from index template', async () => {
        const beforeMapping = await getMapping(testDataStreamName1);
        expect(beforeMapping.properties).eql({
          '@timestamp': { type: 'date' },
        });
        await updateIndexTemplateMappings(testDataStreamName1, {
          properties: {
            test: { type: 'integer' },
          },
        });
        await supertest
          .post(`${API_BASE_PATH}/data_streams/${testDataStreamName1}/mappings_from_template`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const afterMapping = await getMapping(testDataStreamName1);
        expect(afterMapping.properties).eql({
          '@timestamp': { type: 'date' },
          test: { type: 'integer' },
        });
      });
    });

    describe('Rollover', () => {
      const testDataStreamName1 = 'test-data-stream-rollover-1';

      before(async () => {
        await createDataStream(testDataStreamName1);
      });

      after(async () => {
        await deleteDataStream(testDataStreamName1);
      });

      it('Rollover datastreams', async () => {
        await supertest
          .post(`${API_BASE_PATH}/data_streams/${testDataStreamName1}/rollover`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const datastream = await getDatastream(testDataStreamName1);

        expect(datastream.generation).equal(2);
      });
    });
  });
}
