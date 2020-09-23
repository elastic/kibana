/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
// @ts-expect-error
import { overviewNetworkQuery } from '../../../../plugins/security_solution/public/overview/containers/overview_network/index.gql_query';
// @ts-expect-error
import { GetOverviewNetworkQuery } from '../../../../plugins/security_solution/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');
  describe('Overview Network', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

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
        __typename: 'OverviewNetworkData',
      };

      it('Make sure that we get OverviewNetwork data', () => {
        return client
          .query<GetOverviewNetworkQuery.Query>({
            query: overviewNetworkQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              docValueFields: [],
              inspect: false,
            },
          })
          .then((resp) => {
            const overviewNetwork = resp.data.source.OverviewNetwork;
            expect(overviewNetwork).to.eql(expectedResult);
          });
      });
    });

    describe('With packetbeat', () => {
      before(() => esArchiver.load('packetbeat/overview'));
      after(() => esArchiver.unload('packetbeat/overview'));

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
        __typename: 'OverviewNetworkData',
      };

      it('Make sure that we get OverviewNetwork data', () => {
        return client
          .query<GetOverviewNetworkQuery.Query>({
            query: overviewNetworkQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              docValueFields: [],
              inspect: false,
            },
          })
          .then((resp) => {
            const overviewNetwork = resp.data.source.OverviewNetwork;
            expect(overviewNetwork).to.eql(expectedResult);
          });
      });
    });

    describe('With auditbeat', () => {
      before(() => esArchiver.load('auditbeat/overview'));
      after(() => esArchiver.unload('auditbeat/overview'));

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
        __typename: 'OverviewNetworkData',
      };

      it('Make sure that we get OverviewNetwork data', () => {
        return client
          .query<GetOverviewNetworkQuery.Query>({
            query: overviewNetworkQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              docValueFields: [],
              inspect: false,
            },
          })
          .then((resp) => {
            const overviewNetwork = resp.data.source.OverviewNetwork;
            expect(overviewNetwork).to.eql(expectedResult);
          });
      });
    });
  });
}
