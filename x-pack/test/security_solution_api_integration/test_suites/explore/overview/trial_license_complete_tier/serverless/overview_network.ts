/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  NetworkOverviewStrategyResponse,
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

  describe('Overview Network', () => {
    describe('With filebeat', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default');
        roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default');
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';

      const expectedResult = {
        auditbeatSocket: 0,
        filebeatCisco: 0,
        filebeatNetflow: 1273,
        filebeatPanw: 0,
        filebeatSuricata: 4547,
        filebeatZeek: 0,
        packetbeatDNS: 0,
        packetbeatFlow: 0,
        packetbeatTLS: 0,
      };

      it('Make sure that we get OverviewNetwork data', async () => {
        const { overviewNetwork } = await secureBsearch.send<NetworkOverviewStrategyResponse>({
          supertestWithoutAuth,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          internalOrigin: 'Kibana',
          options: {
            defaultIndex: ['filebeat-*'],
            factoryQueryType: NetworkQueries.overview,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(overviewNetwork).to.eql(expectedResult);
      });
    });

    describe('With packetbeat', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/packetbeat/overview');
        roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/packetbeat/overview');
        await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        auditbeatSocket: 0,
        filebeatCisco: 0,
        filebeatNetflow: 0,
        filebeatPanw: 0,
        filebeatSuricata: 0,
        filebeatZeek: 0,
        packetbeatDNS: 44,
        packetbeatFlow: 588,
        packetbeatTLS: 0,
      };

      it('Make sure that we get OverviewNetwork data', async () => {
        const { overviewNetwork } = await secureBsearch.send<NetworkOverviewStrategyResponse>({
          supertestWithoutAuth,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          internalOrigin: 'Kibana',
          options: {
            defaultIndex: ['packetbeat-*'],
            factoryQueryType: NetworkQueries.overview,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(overviewNetwork).to.eql(expectedResult);
      });
    });

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
        auditbeatSocket: 45,
        filebeatCisco: 0,
        filebeatNetflow: 0,
        filebeatPanw: 0,
        filebeatSuricata: 0,
        filebeatZeek: 0,
        packetbeatDNS: 0,
        packetbeatFlow: 0,
        packetbeatTLS: 0,
      };

      it('Make sure that we get OverviewNetwork data', async () => {
        const { overviewNetwork } = await secureBsearch.send<NetworkOverviewStrategyResponse>({
          supertestWithoutAuth,
          apiKeyHeader: roleAuthc.apiKeyHeader,
          internalOrigin: 'Kibana',
          options: {
            defaultIndex: ['auditbeat-*'],
            factoryQueryType: NetworkQueries.overview,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(overviewNetwork).to.eql(expectedResult);
      });
    });
  });
}
