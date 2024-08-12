/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  GetInfraAssetCountRequestBodyPayload,
  GetInfraAssetCountResponsePayload,
  GetInfraAssetCountRequestParamsPayload,
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

  const fetchHostsCount = async ({
    params,
    body,
    roleAuthc,
  }: {
    params: GetInfraAssetCountRequestParamsPayload;
    body: GetInfraAssetCountRequestBodyPayload;
    roleAuthc: RoleCredentials;
  }): Promise<GetInfraAssetCountResponsePayload | undefined> => {
    const { assetType } = params;
    const response = await supertestWithoutAuth
      .post(`/api/infra/${assetType}/count`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('API /api/infra/{assetType}/count', () => {
    let roleAuthc: RoleCredentials;
    describe('works', () => {
      describe('with host', () => {
        before(async () => {
          roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
          return esArchiver.load(ARCHIVE_NAME);
        });
        after(async () => {
          await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
          return esArchiver.unload(ARCHIVE_NAME);
        });

        it('received data', async () => {
          const infraHosts = await fetchHostsCount({
            params: { assetType: 'host' },
            body: {
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
            roleAuthc,
          });

          if (infraHosts) {
            const { count, assetType } = infraHosts;
            expect(count).to.equal(1);
            expect(assetType).to.be('host');
          } else {
            throw new Error('Hosts count response should not be empty');
          }
        });
      });
    });
  });
}
