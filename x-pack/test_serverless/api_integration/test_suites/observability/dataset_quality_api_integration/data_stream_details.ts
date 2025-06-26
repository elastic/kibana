/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import { DatasetQualityApiClient } from './common/dataset_quality_api_supertest';
import { DatasetQualityFtrContextProvider } from './common/services';

export default function ({ getService }: DatasetQualityFtrContextProvider) {
  const datasetQualityApiClient: DatasetQualityApiClient = getService('datasetQualityApiClient');
  const synthtrace = getService('logsSynthtraceEsClient');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const retry = getService('retry');
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

  // Failing: See https://github.com/elastic/kibana/issues/194599
  describe.skip('gets the data stream details', () => {
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

    it('returns "sizeBytes" correctly', async () => {
      // Metering stats api is cached and refreshed every 30 seconds
      await retry.waitForWithTimeout('Metering stats cache is refreshed', 45000, async () => {
        const detailsResponse = await callApi(
          `${type}-${dataset}-${namespace}`,
          roleAuthc,
          internalReqHeader
        );
        if (detailsResponse.body.sizeBytes === 0) {
          throw new Error("Metering stats cache hasn't refreshed");
        }
        return true;
      });

      const resp = await callApi(`${type}-${dataset}-${namespace}`, roleAuthc, internalReqHeader);

      expect(isNaN(resp.body.sizeBytes as number)).to.be(false);
      expect(resp.body.sizeBytes).to.be.greaterThan(0);
    });
  });
}
