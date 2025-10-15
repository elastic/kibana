/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '../../services';
import type { DatasetQualityApiClient } from './common/dataset_quality_api_supertest';
import type { DatasetQualityFtrContextProvider } from './common/services';

export default function ({ getService }: DatasetQualityFtrContextProvider) {
  const datasetQualityApiClient: DatasetQualityApiClient = getService('datasetQualityApiClient');
  const synthtrace = getService('logsSynthtraceEsClient');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const start = '2023-12-11T18:00:00.000Z';
  const end = '2023-12-11T18:01:00.000Z';
  const type = 'logs';
  const dataset = 'nginx.access';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';

  async function callApi(
    dataStream: string,
    body: {
      failureStoreEnabled: boolean;
      customRetentionPeriod: string | undefined;
    },
    roleAuthc: RoleCredentials,
    internalReqHeader: InternalRequestHeader
  ) {
    return await datasetQualityApiClient.slsUser({
      endpoint: 'PUT /internal/dataset_quality/data_streams/{dataStream}/update_failure_store',
      params: {
        path: {
          dataStream,
        },
        body,
      },
      roleAuthc,
      internalReqHeader,
    });
  }

  describe('gets the data stream details', () => {
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await synthtrace.index([
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(dataset)
              .namespace(namespace)
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': serviceName,
                'host.name': hostName,
              })
          ),
      ]);
    });
    after(async () => {
      await synthtrace.clean();
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should enable failure store successfully', async () => {
      const dataStreamName = `${type}-${dataset}-${namespace}`;
      const resp = await callApi(
        dataStreamName,
        {
          failureStoreEnabled: true,
          customRetentionPeriod: undefined,
        },
        roleAuthc,
        internalReqHeader
      );
      expect(resp.status).to.be(200);
    });

    it('should disable failure store successfully', async () => {
      const dataStreamName = `${type}-${dataset}-${namespace}`;
      const resp = await callApi(
        dataStreamName,
        {
          failureStoreEnabled: false,
          customRetentionPeriod: undefined,
        },
        roleAuthc,
        internalReqHeader
      );
      expect(resp.status).to.be(200);
    });

    it('should enable failure store with custom retention period', async () => {
      const dataStreamName = `${type}-${dataset}-${namespace}`;
      const resp = await callApi(
        dataStreamName,
        {
          failureStoreEnabled: true,
          customRetentionPeriod: '30d',
        },
        roleAuthc,
        internalReqHeader
      );
      expect(resp.status).to.be(200);
    });
  });
}
