/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { kpiHostsQuery } from '../../../../plugins/siem/public/containers/kpi_hosts/index.gql_query';
import { GetKpiHostsQuery } from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const kpiHostsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('Kpi Hosts', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

      it('Make sure that we get KpiHosts data', () => {
        return client
          .query<GetKpiHostsQuery.Query>({
            query: kpiHostsQuery,
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
            
            const kpiHosts = resp.data.source.KpiHosts;
            expect(kpiHosts!.hosts).to.equal(1);
            expect(kpiHosts!.hostsHistogram).to.eql([{
                "x": 1549728000000,
                "y": 1574,
                "__typename": "HistogramData"
              },
              {
                "x": 1549738800000,
                "y": 0,
                "__typename": "HistogramData"
              },
              {
                "x": 1549749600000,
                "y": 1302,
                "__typename": "HistogramData"
              },
              {
                "x": 1549760400000,
                "y": 3281,
                "__typename": "HistogramData"
              }]);
            expect(kpiHosts!.authSuccess).to.be(0);
            expect(kpiHosts!.authSuccessHistogram).to.eql([]);
            expect(kpiHosts!.authFailure).to.equal(0);
            expect(kpiHosts!.authFailureHistogram).to.eql([]);
            expect(kpiHosts!.uniqueSourceIps).to.equal(121);
            expect(kpiHosts!.uniqueSourceIpsHistogram).to.eql([
              {
                "x": 1549728000000,
                "y": 1574,
                "__typename": "HistogramData"
              },
              {
                "x": 1549738800000,
                "y": 0,
                "__typename": "HistogramData"
              },
              {
                "x": 1549749600000,
                "y": 1302,
                "__typename": "HistogramData"
              },
              {
                "x": 1549760400000,
                "y": 3281,
                "__typename": "HistogramData"
              }
            ]);
            expect(kpiHosts!.uniqueDestinationIps).to.equal(154);
            expect(kpiHosts!.uniqueDestinationIpsHistogram).to.eql([
              {
                "x": 1549728000000,
                "y": 1574,
                "__typename": "HistogramData"
              },
              {
                "x": 1549738800000,
                "y": 0,
                "__typename": "HistogramData"
              },
              {
                "x": 1549749600000,
                "y": 1302,
                "__typename": "HistogramData"
              },
              {
                "x": 1549760400000,
                "y": 3281,
                "__typename": "HistogramData"
              }
            ]);
          });
      });
    });

    describe('With auditbeat', () => {
      before(() => esArchiver.load('auditbeat/default'));
      after(() => esArchiver.unload('auditbeat/default'));

      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

      it('Make sure that we get KpiHosts data', () => {
        return client
          .query<GetKpiHostsQuery.Query>({
            query: kpiHostsQuery,
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
            const kpiHosts = resp.data.source.KpiHosts;
            expect(kpiHosts!.hosts).to.equal(1);
            expect(kpiHosts!.hostsHistogram).to.eql([{
                "x": 1549728000000,
                "y": 1574,
                "__typename": "HistogramData"
              },
              {
                "x": 1549738800000,
                "y": 0,
                "__typename": "HistogramData"
              },
              {
                "x": 1549749600000,
                "y": 1302,
                "__typename": "HistogramData"
              },
              {
                "x": 1549760400000,
                "y": 3281,
                "__typename": "HistogramData"
              }]);
            expect(kpiHosts!.authSuccess).to.be(0);
            expect(kpiHosts!.authSuccessHistogram).to.eql([]);
            expect(kpiHosts!.authFailure).to.equal(0);
            expect(kpiHosts!.authFailureHistogram).to.eql([]);
            expect(kpiHosts!.uniqueSourceIps).to.equal(121);
            expect(kpiHosts!.uniqueSourceIpsHistogram).to.eql([
              {
                "x": 1549728000000,
                "y": 1574,
                "__typename": "HistogramData"
              },
              {
                "x": 1549738800000,
                "y": 0,
                "__typename": "HistogramData"
              },
              {
                "x": 1549749600000,
                "y": 1302,
                "__typename": "HistogramData"
              },
              {
                "x": 1549760400000,
                "y": 3281,
                "__typename": "HistogramData"
              }
            ]);
            expect(kpiHosts!.uniqueDestinationIps).to.equal(154);
            expect(kpiHosts!.uniqueDestinationIpsHistogram).to.eql([
              {
                "x": 1549728000000,
                "y": 1574,
                "__typename": "HistogramData"
              },
              {
                "x": 1549738800000,
                "y": 0,
                "__typename": "HistogramData"
              },
              {
                "x": 1549749600000,
                "y": 1302,
                "__typename": "HistogramData"
              },
              {
                "x": 1549760400000,
                "y": 3281,
                "__typename": "HistogramData"
              }
            ]);
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default kpiHostsTests;
