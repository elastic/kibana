/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { kpiNetworkQuery } from '../../../../plugins/siem/public/containers/kpi_network/index.gql_query';
import { GetKpiNetworkQuery } from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const kpiNetworkTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('Kpi Network', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

      it('Make sure that we get KpiNetwork data', () => {
        return client
          .query<GetKpiNetworkQuery.Query>({
            query: kpiNetworkQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
            },
          })
          .then(resp => {
            const kpiNetwork = resp.data.source.KpiNetwork;
            expect(kpiNetwork!.networkEvents).to.be(6157);
            expect(kpiNetwork!.uniqueFlowId).to.be(712);
            expect(kpiNetwork!.activeAgents).to.equal(1);
            expect(kpiNetwork!.uniqueSourcePrivateIps).to.equal(8);
            expect(kpiNetwork!.uniqueDestinationPrivateIps).to.equal(9);
            expect(kpiNetwork!.dnsQueries).to.equal(169);
            expect(kpiNetwork!.tlsHandshakes).to.equal(62);
          });
      });
    });

    describe('With packetbeat', () => {
      before(() => esArchiver.load('packetbeat/default'));
      after(() => esArchiver.unload('packetbeat/default'));

      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

      it('Make sure that we get KpiNetwork data', () => {
        return client
          .query<GetKpiNetworkQuery.Query>({
            query: kpiNetworkQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
            },
          })
          .then(resp => {
            const kpiNetwork = resp.data.source.KpiNetwork;
            expect(kpiNetwork!.networkEvents).to.be(6157);
            expect(kpiNetwork!.uniqueFlowId).to.be(712);
            expect(kpiNetwork!.activeAgents).to.equal(1);
            expect(kpiNetwork!.uniqueSourcePrivateIps).to.equal(8);
            expect(kpiNetwork!.uniqueDestinationPrivateIps).to.equal(9);
            expect(kpiNetwork!.dnsQueries).to.equal(169);
            expect(kpiNetwork!.tlsHandshakes).to.equal(62);
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default kpiNetworkTests;
