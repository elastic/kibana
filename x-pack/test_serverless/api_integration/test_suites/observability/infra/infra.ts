/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  GetInfraMetricsRequestBodyPayload,
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
    body: GetInfraMetricsRequestBodyPayload,
    roleAuthc: RoleCredentials
  ): Promise<GetInfraMetricsResponsePayload | undefined> => {
    const response = await supertestWithoutAuth
      .post('/api/metrics/infra')
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('API /metrics/infra', () => {
    let roleAuthc: RoleCredentials;
    describe('works', () => {
      describe('with host asset', () => {
        before(async () => {
          roleAuthc = await svlUserManager.createApiKeyForRole('admin');
          return esArchiver.load(ARCHIVE_NAME);
        });
        after(async () => {
          await svlUserManager.invalidateApiKeyForRole(roleAuthc);
          return esArchiver.unload(ARCHIVE_NAME);
        });

        it('received data', async () => {
          const infraHosts = await fetchInfraHosts(
            {
              type: 'host',
              limit: 100,
              metrics: [
                {
                  type: 'rx',
                },
                {
                  type: 'tx',
                },
                {
                  type: 'memory',
                },
                {
                  type: 'cpu',
                },
                {
                  type: 'diskSpaceUsage',
                },
                {
                  type: 'memoryFree',
                },
              ],
              query: {
                bool: {
                  must: [],
                  filter: [],
                  should: [],
                  must_not: [],
                },
              },
              range: {
                from: timeRange.from,
                to: timeRange.to,
              },
              sourceId: 'default',
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
                  name: 'rx',
                  value: 133425.6,
                },
                {
                  name: 'tx',
                  value: 135892.3,
                },
                {
                  name: 'memory',
                  value: 0.9490000000000001,
                },
                {
                  name: 'cpu',
                  value: 1.021,
                },
                {
                  name: 'diskSpaceUsage',
                  value: 0,
                },
                {
                  name: 'memoryFree',
                  value: 1753829376,
                },
              ],
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
