/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { HostsKpiQueries } from '../../../../plugins/security_solution/common/search_strategy';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Kpi Hosts', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/filebeat/kpi_hosts'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/filebeat/kpi_hosts'));

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        hosts: 1,
        hostsHistogram: [
          {
            x: new Date('2019-02-09T16:45:06.000Z').valueOf(),
            y: 1,
          },
        ],
        authSuccess: 0,
        authSuccessHistogram: null,
        authFailure: 0,
        authFailureHistogram: null,
        uniqueSourceIps: 1,
        uniqueSourceIpsHistogram: [
          {
            x: new Date('2019-02-09T16:45:06.000Z').valueOf(),
            y: 1,
          },
        ],
        uniqueDestinationIps: 1,
        uniqueDestinationIpsHistogram: [
          {
            x: new Date('2019-02-09T16:45:06.000Z').valueOf(),
            y: 1,
          },
        ],
      };

      it('Make sure that we get KpiHosts data', async () => {
        await retry.try(async () => {
          const { body: kpiHosts } = await supertest
            .post('/internal/search/securitySolutionSearchStrategy/')
            .set('kbn-xsrf', 'true')
            .send({
              factoryQueryType: HostsKpiQueries.kpiHosts,
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

          expect(kpiHosts.hostsHistogram!).to.eql(expectedResult.hostsHistogram);
          expect(kpiHosts.hosts!).to.eql(expectedResult.hosts);
        });
      });

      it('Make sure that we get KpiAuthentications data', async () => {
        await retry.try(async () => {
          const { body } = await supertest
            .post('/internal/search/securitySolutionSearchStrategy/')
            .set('kbn-xsrf', 'true')
            .send({
              factoryQueryType: HostsKpiQueries.kpiAuthentications,
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['filebeat-*'],
              docValueFields: [],
              inspect: false,
              /* We need a very long timeout to avoid returning just partial data.
               ** https://github.com/elastic/kibana/blob/master/x-pack/test/api_integration/apis/search/search.ts#L18
               */
              wait_for_completion_timeout: '10s',
            })
            .expect(200);
          expect(body.authenticationsSuccess!).to.eql(expectedResult.authSuccess);
          expect(body.authenticationsSuccessHistogram!).to.eql(expectedResult.authSuccessHistogram);
          expect(body.authenticationsFailure!).to.eql(expectedResult.authFailure);
          expect(body.authenticationsFailureHistogram!).to.eql(expectedResult.authFailureHistogram);
        });
      });

      it('Make sure that we get KpiUniqueIps data', async () => {
        await retry.try(async () => {
          const { body } = await supertest
            .post('/internal/search/securitySolutionSearchStrategy/')
            .set('kbn-xsrf', 'true')
            .send({
              factoryQueryType: HostsKpiQueries.kpiUniqueIps,
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
          expect(body.uniqueDestinationIps!).to.eql(expectedResult.uniqueDestinationIps);
          expect(body.uniqueDestinationIpsHistogram!).to.eql(
            expectedResult.uniqueDestinationIpsHistogram
          );
          expect(body.uniqueSourceIps!).to.eql(expectedResult.uniqueSourceIps);
          expect(body.uniqueSourceIpsHistogram!).to.eql(expectedResult.uniqueSourceIpsHistogram);
        });
      });
    });

    describe('With auditbeat', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/auditbeat/kpi_hosts'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/kpi_hosts'));

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        hosts: 3,
        hostsHistogram: [
          {
            x: new Date('2018-11-27T00:00:00.000Z').valueOf(),
            y: 1,
          },
          {
            x: new Date('2018-11-27T00:30:00.000Z').valueOf(),
            y: 0,
          },
          {
            x: new Date('2018-11-27T01:00:00.000Z').valueOf(),
            y: 0,
          },
          {
            x: new Date('2018-11-27T01:30:00.000Z').valueOf(),
            y: 0,
          },
          {
            x: new Date('2018-11-27T02:00:00.000Z').valueOf(),
            y: 1,
          },
          {
            x: new Date('2018-11-27T02:30:00.000Z').valueOf(),
            y: 1,
          },
        ],
        authSuccess: 0,
        authSuccessHistogram: null,
        authFailure: 0,
        authFailureHistogram: null,
        uniqueSourceIps: 3,
        uniqueSourceIpsHistogram: [
          { x: 1543276800000, y: 1 },
          { x: 1543278600000, y: 0 },
          { x: 1543280400000, y: 0 },
          { x: 1543282200000, y: 0 },
          { x: 1543284000000, y: 1 },
          { x: 1543285800000, y: 1 },
        ],
        uniqueDestinationIps: 0,
        uniqueDestinationIpsHistogram: [
          { x: 1543276800000, y: 0 },
          { x: 1543278600000, y: 0 },
          { x: 1543280400000, y: 0 },
          { x: 1543282200000, y: 0 },
          { x: 1543284000000, y: 0 },
          { x: 1543285800000, y: 0 },
        ],
      };

      it('Make sure that we get KpiHosts data', async () => {
        await retry.try(async () => {
          const { body: kpiHosts } = await supertest
            .post('/internal/search/securitySolutionSearchStrategy/')
            .set('kbn-xsrf', 'true')
            .send({
              factoryQueryType: HostsKpiQueries.kpiHosts,
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['auditbeat-*'],
              docValueFields: [],
              inspect: false,
              wait_for_completion_timeout: '10s',
            })
            .expect(200);

          expect(kpiHosts.hostsHistogram!).to.eql(expectedResult.hostsHistogram);
          expect(kpiHosts.hosts!).to.eql(expectedResult.hosts);
        });
      });

      it('Make sure that we get KpiAuthentications data', async () => {
        await retry.try(async () => {
          const { body } = await supertest
            .post('/internal/search/securitySolutionSearchStrategy/')
            .set('kbn-xsrf', 'true')
            .send({
              factoryQueryType: HostsKpiQueries.kpiAuthentications,
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['auditbeat-*'],
              docValueFields: [],
              inspect: false,
              wait_for_completion_timeout: '10s',
            })
            .expect(200);
          expect(body.authenticationsSuccess!).to.eql(expectedResult.authSuccess);
          expect(body.authenticationsSuccessHistogram!).to.eql(expectedResult.authSuccessHistogram);
          expect(body.authenticationsFailure!).to.eql(expectedResult.authFailure);
          expect(body.authenticationsFailureHistogram!).to.eql(expectedResult.authFailureHistogram);
        });
      });

      it('Make sure that we get KpiUniqueIps data', async () => {
        await retry.try(async () => {
          const { body } = await supertest
            .post('/internal/search/securitySolutionSearchStrategy/')
            .set('kbn-xsrf', 'true')
            .send({
              factoryQueryType: HostsKpiQueries.kpiUniqueIps,
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['auditbeat-*'],
              docValueFields: [],
              inspect: false,
              wait_for_completion_timeout: '10s',
            })
            .expect(200);
          expect(body.uniqueDestinationIps!).to.eql(expectedResult.uniqueDestinationIps);
          expect(body.uniqueDestinationIpsHistogram!).to.eql(
            expectedResult.uniqueDestinationIpsHistogram
          );
          expect(body.uniqueSourceIps!).to.eql(expectedResult.uniqueSourceIps);
          expect(body.uniqueSourceIpsHistogram!).to.eql(expectedResult.uniqueSourceIpsHistogram);
        });
      });
    });
  });
}
