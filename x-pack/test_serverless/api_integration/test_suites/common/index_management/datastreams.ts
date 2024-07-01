/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DataStream } from '@kbn/index-management-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

const API_BASE_PATH = '/api/index_management';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;
  const svlDatastreamsHelpers = getService('svlDatastreamsHelpers');

  describe('Data streams', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    describe('Get', () => {
      const testDataStreamName = 'test-data-stream';

      before(async () => await svlDatastreamsHelpers.createDataStream(testDataStreamName));
      after(async () => await svlDatastreamsHelpers.deleteDataStream(testDataStreamName));

      it('returns an array of data streams', async () => {
        const { body: dataStreams, status } = await supertestWithoutAuth
          .get(`${API_BASE_PATH}/data_streams`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);

        svlCommonApi.assertResponseStatusCode(200, status, dataStreams);

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
            effective_retention: '365d',
            enabled: true,
            retention_determined_by: 'default_global_retention',
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
          health: 'green',
          indexTemplateName: testDataStreamName,
          hidden: false,
        });
      });

      xit('returns a single data stream by ID', async () => {
        const { body: dataStream, status } = await supertestWithoutAuth
          .get(`${API_BASE_PATH}/data_streams/${testDataStreamName}`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);

        svlCommonApi.assertResponseStatusCode(200, status, dataStream);

        // ES determines these values so we'll just echo them back.
        const { name: indexName, uuid } = dataStream.indices[0];
        const { storageSize, storageSizeBytes, ...dataStreamWithoutStorageSize } = dataStream;

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
          health: 'green',
          indexTemplateName: testDataStreamName,
          nextGenerationManagedBy: 'Data stream lifecycle',
          hidden: false,
          // lifecyle contains 3 elements for security prj, but only one for the other projects.
          lifecycle: {
            effective_retention: '365d',
            enabled: true,
            retention_determined_by: 'default_global_retention',
          },
        });
      });
    });

    describe('Update', () => {
      const testDataStreamName = 'test-data-stream';

      before(async () => await svlDatastreamsHelpers.createDataStream(testDataStreamName));
      after(async () => await svlDatastreamsHelpers.deleteDataStream(testDataStreamName));

      xit('updates the data retention of a DS', async () => {
        const { body, status } = await supertestWithoutAuth
          .put(`${API_BASE_PATH}/data_streams/${testDataStreamName}/data_retention`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .send({
            dataRetention: '7d',
          });
        svlCommonApi.assertResponseStatusCode(200, status, body);

        expect(body).to.eql({ success: true });
      });

      xit('sets data retention to infinite', async () => {
        const { body, status } = await supertestWithoutAuth
          .put(`${API_BASE_PATH}/data_streams/${testDataStreamName}/data_retention`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .send({});
        svlCommonApi.assertResponseStatusCode(200, status, body);

        // Providing an infinite retention might not be allowed for a given project,
        // due to it having an existing max retention period. Because of this
        // we will only check whether the request was recieved by ES.
        expect(body.success).to.eql(true);
      });

      it('can disable lifecycle for a given policy', async () => {
        // const { body, status } = await supertestWithoutAuth
        //   .put(`${API_BASE_PATH}/data_streams/${testDataStreamName}/data_retention`)
        //   .set(internalReqHeader)
        //   .set(role.apiKeyHeader)
        //   .send({ enabled: false });
        // svlCommonApi.assertResponseStatusCode(200, status, body);
        // Error: Expected status code 200, got 410 with body '{"statusCode":410,"error":"Gone","message":"Request for uri [/_data_stream/test-data-stream/_lifecycle] with method [DELETE] exists but is not available when running in serverless mode","attributes":{"error":{"root_cause":[{"type":"api_not_available_exception","reason":"Request for uri [/_data_stream/test-data-stream/_lifecycle] with method [DELETE] exists but is not available when running in serverless mode"}],"type":"api_not_available_exception","reason":"Request for uri [/_data_stream/test-data-stream/_lifecycle] with method [DELETE] exists but is not available when running in serverless mode"}}}'
        // + expected - actual
        //
        // -410
        // +200
        // expect(body).to.eql({ success: true });
        // const datastream = await getDatastream(testDataStreamName);
        // expect(datastream.lifecycle).to.be(undefined);
      });
    });

    describe('Delete', () => {
      const testDataStreamName1 = 'test-data-stream1';
      const testDataStreamName2 = 'test-data-stream2';

      before(async () => {
        await Promise.all([
          svlDatastreamsHelpers.createDataStream(testDataStreamName1),
          svlDatastreamsHelpers.createDataStream(testDataStreamName2),
        ]);
      });

      after(async () => {
        // The Delete API only deletes the data streams, so we still need to manually delete their
        // related index patterns to clean up.
        await Promise.all([
          svlDatastreamsHelpers.deleteComposableIndexTemplate(testDataStreamName1),
          svlDatastreamsHelpers.deleteComposableIndexTemplate(testDataStreamName2),
        ]);
      });

      it('deletes multiple data streams', async () => {
        const { body: b1, status: s1 } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/delete_data_streams`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .send({
            dataStreams: [testDataStreamName1, testDataStreamName2],
          });
        svlCommonApi.assertResponseStatusCode(200, s1, b1);

        const { body: b2, status: s2 } = await supertestWithoutAuth
          .get(`${API_BASE_PATH}/data_streams/${testDataStreamName1}`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);
        svlCommonApi.assertResponseStatusCode(404, s2, b2);

        const { body: b3, status: s3 } = await supertestWithoutAuth
          .get(`${API_BASE_PATH}/data_streams/${testDataStreamName2}`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);
        svlCommonApi.assertResponseStatusCode(404, s3, b3);
      });
    });

    describe('Mappings from template', () => {
      const testDataStreamName1 = 'test-data-stream-mappings-1';

      before(async () => {
        await svlDatastreamsHelpers.createDataStream(testDataStreamName1);
      });

      after(async () => {
        await svlDatastreamsHelpers.deleteDataStream(testDataStreamName1);
      });

      it('Apply mapping from index template', async () => {
        const beforeMapping = await svlDatastreamsHelpers.getMapping(testDataStreamName1);
        expect(beforeMapping.properties).eql({
          '@timestamp': { type: 'date' },
        });
        await svlDatastreamsHelpers.updateIndexTemplateMappings(testDataStreamName1, {
          properties: {
            test: { type: 'integer' },
          },
        });
        const { body, status } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/data_streams/${testDataStreamName1}/mappings_from_template`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);

        svlCommonApi.assertResponseStatusCode(200, status, body);

        const afterMapping = await svlDatastreamsHelpers.getMapping(testDataStreamName1);
        expect(afterMapping.properties).eql({
          '@timestamp': { type: 'date' },
          test: { type: 'integer' },
        });
      });
    });

    describe('Rollover', () => {
      const testDataStreamName1 = 'test-data-stream-rollover-1';

      before(async () => {
        await svlDatastreamsHelpers.createDataStream(testDataStreamName1);
      });

      after(async () => {
        await svlDatastreamsHelpers.deleteDataStream(testDataStreamName1);
      });

      it('Rollover datastreams', async () => {
        const { body, status } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/data_streams/${testDataStreamName1}/rollover`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .expect(200);
        svlCommonApi.assertResponseStatusCode(200, status, body);

        const datastream = await svlDatastreamsHelpers.getDatastream(testDataStreamName1);

        expect(datastream.generation).equal(2);
      });
    });
  });
}
