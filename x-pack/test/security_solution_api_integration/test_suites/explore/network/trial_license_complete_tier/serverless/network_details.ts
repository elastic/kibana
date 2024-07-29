/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  NetworkDetailsStrategyResponse,
  NetworkQueries,
} from '@kbn/security-solution-plugin/common/search_strategy';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { RoleCredentials } from '../../../../../../../test_serverless/shared/services';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const secureBsearch = getService('secureBsearch');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;
  describe('Network details', () => {
    describe('With filebeat', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default');
        roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default');
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      it('Make sure that we get Network details data', async () => {
        const body = await secureBsearch.send<NetworkDetailsStrategyResponse>({
          supertestWithoutAuth,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          internalOrigin: 'Kibana',
          options: {
            ip: '151.205.0.17',
            defaultIndex: ['filebeat-*'],
            factoryQueryType: NetworkQueries.details,
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(body.networkDetails.source?.geo.continent_name).to.eql(['North America']);
        expect(body.networkDetails.source?.geo.location?.lat!).to.eql([37.751]);
        expect(body.networkDetails.host?.os?.platform).to.eql(['raspbian']);
      });
    });

    describe('With packetbeat', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/packetbeat/default');
        roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/packetbeat/default');
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      it('Make sure that we get Network details data', async () => {
        const body = await secureBsearch.send<NetworkDetailsStrategyResponse>({
          supertestWithoutAuth,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          internalOrigin: 'Kibana',
          options: {
            ip: '185.53.91.88',
            defaultIndex: ['packetbeat-*'],
            factoryQueryType: NetworkQueries.details,
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(body.networkDetails.host?.id).to.eql(['2ce8b1e7d69e4a1d9c6bcddc473da9d9']);
        expect(body.networkDetails.host?.name).to.eql(['zeek-sensor-amsterdam']);
        expect(body.networkDetails.host?.os?.platform!).to.eql(['ubuntu']);
      });
    });
  });
}
