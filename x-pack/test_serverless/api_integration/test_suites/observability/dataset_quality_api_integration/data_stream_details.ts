/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import { expectToReject } from './utils';
import {
  DatasetQualityApiClient,
  DatasetQualityApiError,
} from './common/dataset_quality_api_supertest';
import { DatasetQualityFtrContextProvider } from './common/services';

export default function ({ getService }: DatasetQualityFtrContextProvider) {
  const datasetQualityApiClient: DatasetQualityApiClient = getService('datasetQualityApiClient');
  const synthtrace = getService('logSynthtraceEsClient');
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
    roleAuthc: RoleCredentials,
    internalReqHeader: InternalRequestHeader
  ) {
    return await datasetQualityApiClient.slsUser({
      endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/details',
      params: {
        path: {
          dataStream,
        },
        query: {
          start,
          end,
        },
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
      return synthtrace.index([
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

    it('returns error when dataStream param is not provided', async () => {
      const expectedMessage = 'Data Stream name cannot be empty';
      const err = await expectToReject<DatasetQualityApiError>(() =>
        callApi(encodeURIComponent(' '), roleAuthc, internalReqHeader)
      );
      expect(err.res.status).to.be(400);
      expect(err.res.body.message.indexOf(expectedMessage)).to.greaterThan(-1);
    });

    it('returns {} if matching data stream is not available', async () => {
      const nonExistentDataSet = 'Non-existent';
      const nonExistentDataStream = `${type}-${nonExistentDataSet}-${namespace}`;
      const resp = await callApi(nonExistentDataStream, roleAuthc, internalReqHeader);
      expect(resp.body).empty();
    });

    it('returns "sizeBytes" as null in serverless', async () => {
      const resp = await callApi(`${type}-${dataset}-${namespace}`, roleAuthc, internalReqHeader);
      expect(resp.body.sizeBytes).to.be(null);
    });

    it('returns service.name and host.name correctly', async () => {
      const resp = await callApi(`${type}-${dataset}-${namespace}`, roleAuthc, internalReqHeader);
      expect(resp.body.services).to.eql({ ['service.name']: [serviceName] });
      expect(resp.body.hosts?.['host.name']).to.eql([hostName]);
    });
  });
}
