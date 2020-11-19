/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { HostsKpiQueries } from '../../../../plugins/security_solution/common/search_strategy';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Kpi Hosts', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        hosts: 1,
        hostsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 1,
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 1,
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 1,
          },
        ],
        authSuccess: 0,
        authSuccessHistogram: null,
        authFailure: 0,
        authFailureHistogram: null,
        uniqueSourceIps: 121,
        uniqueSourceIpsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 52,
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 31,
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 88,
          },
        ],
        uniqueDestinationIps: 154,
        uniqueDestinationIpsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 61,
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 45,
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 114,
          },
        ],
      };

      it('Make sure that we get KpiHosts data', async () => {
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
          })
          .expect(200);

        expect(kpiHosts.hostsHistogram!).to.eql(expectedResult.hostsHistogram);
        expect(kpiHosts.hosts!).to.eql(expectedResult.hosts);
      });

      it('Make sure that we get KpiAuthentications data', async () => {
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
          })
          .expect(200);
        expect(body.authenticationsSuccess!).to.eql(expectedResult.authSuccess);
        expect(body.authenticationsSuccessHistogram!).to.eql(expectedResult.authSuccessHistogram);
        expect(body.authenticationsFailure!).to.eql(expectedResult.authSuccess);
        expect(body.authenticationsFailureHistogram!).to.eql(expectedResult.authFailureHistogram);
      });

      it('Make sure that we get KpiUniqueIps data', async () => {
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

    describe('With auditbeat', () => {
      before(() => esArchiver.load('auditbeat/default'));
      after(() => esArchiver.unload('auditbeat/default'));

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        hosts: 6,
        hostsHistogram: [
          {
            x: new Date('2018-11-27T00:00:00.000Z').valueOf(),
            y: 6,
          },
          {
            x: new Date('2018-11-27T00:30:00.000Z').valueOf(),
            y: 6,
          },
          {
            x: new Date('2018-11-27T01:00:00.000Z').valueOf(),
            y: 6,
          },
          {
            x: new Date('2018-11-27T01:30:00.000Z').valueOf(),
            y: 6,
          },
          {
            x: new Date('2018-11-27T02:00:00.000Z').valueOf(),
            y: 6,
          },
          {
            x: new Date('2018-11-27T02:30:00.000Z').valueOf(),
            y: 6,
          },
        ],
        authSuccess: null,
        authSuccessHistogram: null,
        authFailure: 0,
        authFailureHistogram: null,
        uniqueSourceIps: null,
        uniqueSourceIpsHistogram: null,
        uniqueDestinationIps: null,
        uniqueDestinationIpsHistogram: null,
      };

      it('Make sure that we get KpiHosts data', async () => {
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
          })
          .expect(200);

        expect(kpiHosts.hostsHistogram!).to.eql(expectedResult.hostsHistogram);
        expect(kpiHosts.hosts!).to.eql(expectedResult.hosts);
      });

      it('Make sure that we get KpiAuthentications data', async () => {
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
          })
          .expect(200);
        expect(body.authenticationsSuccess!).to.eql(expectedResult.authSuccess);
        expect(body.authenticationsSuccessHistogram!).to.eql(expectedResult.authSuccessHistogram);
        expect(body.authenticationsFailure!).to.eql(expectedResult.authSuccess);
        expect(body.authenticationsFailureHistogram!).to.eql(expectedResult.authFailureHistogram);
      });

      it('Make sure that we get KpiUniqueIps data', async () => {
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
}
