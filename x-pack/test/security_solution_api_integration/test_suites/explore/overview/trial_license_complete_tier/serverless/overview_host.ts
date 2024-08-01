/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  HostsQueries,
  HostsOverviewStrategyResponse,
} from '@kbn/security-solution-plugin/common/search_strategy';
import { RoleCredentials } from '@kbn/test-suites-serverless/shared/services';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const secureBsearch = getService('secureBsearch');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;
  describe('Overview Host', () => {
    describe('With auditbeat', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/overview');
        roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/overview');
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        auditbeatAuditd: 2194,
        auditbeatFIM: 4,
        auditbeatLogin: 2810,
        auditbeatPackage: 3,
        auditbeatProcess: 7,
        auditbeatUser: 6,
        endgameDns: 1,
        endgameFile: 2,
        endgameImageLoad: 1,
        endgameNetwork: 4,
        endgameProcess: 2,
        endgameRegistry: 1,
        endgameSecurity: 4,
        filebeatSystemModule: 0,
        winlogbeatSecurity: 0,
        winlogbeatMWSysmonOperational: 0,
      };

      it('Make sure that we get OverviewHost data', async () => {
        const { overviewHost } = await secureBsearch.send<HostsOverviewStrategyResponse>({
          supertestWithoutAuth,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          internalOrigin: 'Kibana',
          options: {
            defaultIndex: ['auditbeat-*'],
            factoryQueryType: HostsQueries.overview,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(overviewHost).to.eql(expectedResult);
      });
    });
  });
}
