/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  GetInfraHostsCountRequestBodyPayload,
  GetInfraHostsCountRequestResponsePayload,
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

  const fetchHostsCount = async (
    body: GetInfraHostsCountRequestBodyPayload,
    roleAuthc: RoleCredentials
  ): Promise<GetInfraHostsCountRequestResponsePayload | undefined> => {
    const response = await supertestWithoutAuth
      .post('/api/metrics/infra/hosts_count')
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('API /api/metrics/infra/hosts_count', () => {
    let roleAuthc: RoleCredentials;
    describe('works', () => {
      describe('with system module monitored host', () => {
        before(async () => {
          roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
          return esArchiver.load(ARCHIVE_NAME);
        });
        after(async () => {
          await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
          return esArchiver.unload(ARCHIVE_NAME);
        });

        it('received data', async () => {
          const infraHosts = await fetchHostsCount(
            {
              type: 'host',
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
              sourceId: 'default',
            },
            roleAuthc
          );

          if (infraHosts) {
            const { count, type } = infraHosts;
            expect(count).to.equal(1);
            expect(type).to.be('host');
          } else {
            throw new Error('Hosts count response should not be empty');
          }
        });
      });
    });
  });
}
