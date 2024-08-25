/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  GetInfraMetricsRequestBodyPayloadClient,
  GetInfraMetricsResponsePayload,
} from '@kbn/infra-plugin/common/http_api';
import type { RoleCredentials } from '../../../../shared/services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

import { DATES, ARCHIVE_NAME } from './constants';

const timeRange = {
  from: DATES.serverlessTestingHostDateString.min,
  to: DATES.serverlessTestingHostDateString.max,
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  const fetchInfraHosts = async (
    body: GetInfraMetricsRequestBodyPayloadClient,
    roleAuthc: RoleCredentials
  ): Promise<GetInfraMetricsResponsePayload | undefined> => {
    const response = await supertestWithoutAuth
      .post('/api/metrics/infra/host')
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('API /metrics/infra/host', () => {
    let roleAuthc: RoleCredentials;
    describe('works', () => {
      describe('with host asset', () => {
        before(async () => {
          roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
          return esArchiver.load(ARCHIVE_NAME);
        });
        after(async () => {
          await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
          return esArchiver.unload(ARCHIVE_NAME);
        });

        it('received data', async () => {
          const infraHosts = await fetchInfraHosts(
            {
              limit: 100,
              metrics: ['rxV2', 'txV2', 'memory', 'cpuV2', 'diskSpaceUsage', 'memoryFree'],
              query: {
                bool: {
                  must: [],
                  filter: [],
                  should: [],
                  must_not: [],
                },
              },
              from: timeRange.from,
              to: timeRange.to,
            },
            roleAuthc
          );

          if (infraHosts) {
            const { nodes } = infraHosts;
            expect(nodes.length).to.equal(1);
            const firstNode = nodes[0];
            expect(firstNode).to.eql({
              metadata: [
                {
                  name: 'host.os.name',
                  value: 'macOS',
                },
                {
                  name: 'cloud.provider',
                  value: null,
                },
                {
                  name: 'host.ip',
                  value: '192.168.1.79',
                },
              ],
              metrics: [
                {
                  name: 'rxV2',
                  value: 17886.18845261874,
                },
                {
                  name: 'txV2',
                  value: 18216.85858680644,
                },
                {
                  name: 'memory',
                  value: 0.9490000000000001,
                },
                {
                  name: 'cpuV2',
                  value: 0.124,
                },
                {
                  name: 'diskSpaceUsage',
                  value: null,
                },
                {
                  name: 'memoryFree',
                  value: 1753829376,
                },
              ],
              hasSystemMetrics: true,
              name: 'serverless-host',
            });
          } else {
            throw new Error('Hosts response should not be empty');
          }
        });
      });
    });
  });
}
