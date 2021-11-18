/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  NetworkKpiDnsStrategyResponse,
  NetworkKpiNetworkEventsStrategyResponse,
  NetworkKpiQueries,
  NetworkKpiTlsHandshakesStrategyResponse,
  NetworkKpiUniqueFlowsStrategyResponse,
  NetworkKpiUniquePrivateIpsStrategyResponse,
} from '../../../../plugins/security_solution/common/search_strategy';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const bsearch = getService('bsearch');

  describe('Kpi Network', () => {
    describe('With filebeat', () => {
      before(
        async () => await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default')
      );
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default')
      );

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        networkEvents: 6157,
        uniqueFlowId: 712,
        uniqueSourcePrivateIps: 8,
        uniqueSourcePrivateIpsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 8,
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 8,
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 7,
          },
        ],
        uniqueDestinationPrivateIps: 9,
        uniqueDestinationPrivateIpsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 8,
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 8,
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 8,
          },
        ],
        dnsQueries: 169,
        tlsHandshakes: 62,
      };

      it('Make sure that we get KpiNetwork uniqueFlows data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiUniqueFlowsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.uniqueFlows,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(kpiNetwork.uniqueFlowId).to.eql(expectedResult.uniqueFlowId);
      });

      it('Make sure that we get KpiNetwork networkEvents data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiNetworkEventsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.networkEvents,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(kpiNetwork.networkEvents).to.eql(expectedResult.networkEvents);
      });

      it('Make sure that we get KpiNetwork DNS data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiDnsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.dns,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(kpiNetwork.dnsQueries).to.eql(expectedResult.dnsQueries);
      });

      it('Make sure that we get KpiNetwork networkEvents data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiNetworkEventsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.networkEvents,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(kpiNetwork.networkEvents).to.eql(expectedResult.networkEvents);
      });

      it('Make sure that we get KpiNetwork tlsHandshakes data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiTlsHandshakesStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.tlsHandshakes,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(kpiNetwork.tlsHandshakes).to.eql(expectedResult.tlsHandshakes);
      });

      it('Make sure that we get KpiNetwork uniquePrivateIps data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiUniquePrivateIpsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.uniquePrivateIps,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(kpiNetwork.uniqueDestinationPrivateIps).to.eql(
          expectedResult.uniqueDestinationPrivateIps
        );
        expect(kpiNetwork.uniqueDestinationPrivateIpsHistogram).to.eql(
          expectedResult.uniqueDestinationPrivateIpsHistogram
        );
        expect(kpiNetwork.uniqueSourcePrivateIps).to.eql(expectedResult.uniqueSourcePrivateIps);
        expect(kpiNetwork.uniqueSourcePrivateIpsHistogram).to.eql(
          expectedResult.uniqueSourcePrivateIpsHistogram
        );
      });
    });

    describe('With packetbeat', () => {
      before(
        async () => await esArchiver.load('x-pack/test/functional/es_archives/packetbeat/default')
      );
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/packetbeat/default')
      );

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        networkEvents: 665,
        uniqueFlowId: 124,
        uniqueSourcePrivateIps: 0,
        uniqueSourcePrivateIpsHistogram: null,
        uniqueDestinationPrivateIps: 0,
        uniqueDestinationPrivateIpsHistogram: null,
        dnsQueries: 0,
        tlsHandshakes: 1,
      };

      it('Make sure that we get KpiNetwork uniqueFlows data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiUniqueFlowsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.uniqueFlows,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(kpiNetwork.uniqueFlowId).to.eql(expectedResult.uniqueFlowId);
      });

      it('Make sure that we get KpiNetwork DNS data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiDnsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.dns,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(kpiNetwork.dnsQueries).to.eql(expectedResult.dnsQueries);
      });

      it('Make sure that we get KpiNetwork networkEvents data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiNetworkEventsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.networkEvents,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(kpiNetwork.networkEvents).to.eql(expectedResult.networkEvents);
      });

      it('Make sure that we get KpiNetwork tlsHandshakes data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiTlsHandshakesStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.tlsHandshakes,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(kpiNetwork.tlsHandshakes).to.eql(expectedResult.tlsHandshakes);
      });

      it('Make sure that we get KpiNetwork uniquePrivateIps data', async () => {
        const kpiNetwork = await bsearch.send<NetworkKpiUniquePrivateIpsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkKpiQueries.uniquePrivateIps,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(kpiNetwork.uniqueDestinationPrivateIps).to.eql(
          expectedResult.uniqueDestinationPrivateIps
        );
        expect(kpiNetwork.uniqueDestinationPrivateIpsHistogram).to.eql(
          expectedResult.uniqueDestinationPrivateIpsHistogram
        );
        expect(kpiNetwork.uniqueSourcePrivateIps).to.eql(expectedResult.uniqueSourcePrivateIps);
        expect(kpiNetwork.uniqueSourcePrivateIpsHistogram).to.eql(
          expectedResult.uniqueSourcePrivateIpsHistogram
        );
      });
    });
  });
}
