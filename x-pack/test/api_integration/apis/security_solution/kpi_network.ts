/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { NetworkKpiQueries } from '../../../../plugins/security_solution/common/search_strategy';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Kpi Network', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/filebeat/default'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default'));

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
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.uniqueFlows,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(kpiNetwork.uniqueFlowId).to.eql(expectedResult.uniqueFlowId);
      });

      it('Make sure that we get KpiNetwork networkEvents data', async () => {
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.networkEvents,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(kpiNetwork.networkEvents).to.eql(expectedResult.networkEvents);
      });

      it('Make sure that we get KpiNetwork DNS data', async () => {
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.dns,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(kpiNetwork.dnsQueries).to.eql(expectedResult.dnsQueries);
      });

      it('Make sure that we get KpiNetwork networkEvents data', async () => {
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.networkEvents,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(kpiNetwork.networkEvents).to.eql(expectedResult.networkEvents);
      });

      it('Make sure that we get KpiNetwork tlsHandshakes data', async () => {
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.tlsHandshakes,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(kpiNetwork.tlsHandshakes).to.eql(expectedResult.tlsHandshakes);
      });

      it('Make sure that we get KpiNetwork uniquePrivateIps data', async () => {
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.uniquePrivateIps,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['filebeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

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
      before(() => esArchiver.load('x-pack/test/functional/es_archives/packetbeat/default'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/packetbeat/default'));

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
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.uniqueFlows,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(kpiNetwork.uniqueFlowId).to.eql(expectedResult.uniqueFlowId);
      });

      it('Make sure that we get KpiNetwork DNS data', async () => {
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.dns,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(kpiNetwork.dnsQueries).to.eql(expectedResult.dnsQueries);
      });

      it('Make sure that we get KpiNetwork networkEvents data', async () => {
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.networkEvents,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(kpiNetwork.networkEvents).to.eql(expectedResult.networkEvents);
      });

      it('Make sure that we get KpiNetwork tlsHandshakes data', async () => {
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.tlsHandshakes,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

        expect(kpiNetwork.tlsHandshakes).to.eql(expectedResult.tlsHandshakes);
      });

      it('Make sure that we get KpiNetwork uniquePrivateIps data', async () => {
        const { body: kpiNetwork } = await supertest
          .post('/internal/search/securitySolutionSearchStrategy/')
          .set('kbn-xsrf', 'true')
          .send({
            factoryQueryType: NetworkKpiQueries.uniquePrivateIps,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
            wait_for_completion_timeout: '10s',
          })
          .expect(200);

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
