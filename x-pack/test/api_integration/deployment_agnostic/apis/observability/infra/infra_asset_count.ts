/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  GetInfraAssetCountRequestBodyPayloadClient,
  GetInfraAssetCountResponsePayload,
  GetInfraAssetCountRequestParamsPayload,
} from '@kbn/infra-plugin/common/http_api';
import type { SupertestWithRoleScopeType } from '../../../services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

import { DATES, ARCHIVE_NAME } from './utils/constants';

const timeRange = {
  from: DATES.serverlessTestingHostDateString.min,
  to: DATES.serverlessTestingHostDateString.max,
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  describe('API /api/infra/{assetType}/count', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    const fetchHostsCount = async ({
      params,
      body,
    }: {
      params: GetInfraAssetCountRequestParamsPayload;
      body: GetInfraAssetCountRequestBodyPayloadClient;
    }): Promise<GetInfraAssetCountResponsePayload | undefined> => {
      const { assetType } = params;
      const response = await supertestWithAdminScope
        .post(`/api/infra/${assetType}/count`)
        .send(body)
        .expect(200);
      return response.body;
    };

    describe('works', () => {
      describe('with host', () => {
        before(async () => {
          supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
            withInternalHeaders: true,
          });
          await esArchiver.load(ARCHIVE_NAME);
        });
        after(async () => {
          await esArchiver.unload(ARCHIVE_NAME);
          await supertestWithAdminScope.destroy();
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
