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
      const expectedResult = {
        __typename: 'KpiHostsData',
        hosts: 1,
        hostsHistogram: [
          {
            x: '2019-02-09T16:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 1,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T19:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 0,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T22:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 1,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-10T01:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 1,
            },
            __typename: 'HistogramData',
          },
        ],
        authSuccess: 0,
        authSuccessHistogram: [],
        authFailure: 0,
        authFailureHistogram: [],
        uniqueSourceIps: 121,
        uniqueSourceIpsHistogram: [
          {
            x: '2019-02-09T16:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 52,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T19:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 0,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T22:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 31,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-10T01:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 88,
            },
            __typename: 'HistogramData',
          },
        ],
        uniqueDestinationIps: 154,
        uniqueDestinationIpsHistogram: [
          {
            x: '2019-02-09T16:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 61,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T19:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 0,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T22:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 45,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-10T01:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 114,
            },
            __typename: 'HistogramData',
          },
        ],
      };

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
            expect(kpiHosts!).to.eql(expectedResult);
          });
      });
    });

    describe('With auditbeat', () => {
      before(() => esArchiver.load('auditbeat/default'));
      after(() => esArchiver.unload('auditbeat/default'));

      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();
      const expectedResult = {
        __typename: 'KpiHostsData',
        hosts: 1,
        hostsHistogram: [
          {
            x: '2019-02-09T16:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 1,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T19:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 0,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T22:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 1,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-10T01:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 1,
            },
            __typename: 'HistogramData',
          },
        ],
        authSuccess: 0,
        authSuccessHistogram: [],
        authFailure: 0,
        authFailureHistogram: [],
        uniqueSourceIps: 121,
        uniqueSourceIpsHistogram: [
          {
            x: '2019-02-09T16:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 52,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T19:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 0,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T22:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 31,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-10T01:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 88,
            },
            __typename: 'HistogramData',
          },
        ],
        uniqueDestinationIps: 154,
        uniqueDestinationIpsHistogram: [
          {
            x: '2019-02-09T16:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 61,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T19:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 0,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-09T22:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 45,
            },
            __typename: 'HistogramData',
          },
          {
            x: '2019-02-10T01:00:00.000Z',
            y: {
              __typename: 'Count',
              doc_count: null,
              value: 114,
            },
            __typename: 'HistogramData',
          },
        ],
      };
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
            expect(kpiHosts!).to.eql(expectedResult);
            // expect(kpiHosts!.hostsHistogram).to.eql([
            //   {
            //     x: '2019-02-09T16:00:00.000Z',
            //     y: {
            //       __typename: 'Count',
            //       doc_count: null,
            //       value: 1,
            //     },
            //     __typename: 'HistogramData',
            //   },
            //   {
            //     x: '2019-02-09T19:00:00.000Z',
            //     y: {
            //       __typename: 'Count',
            //       doc_count: null,
            //       value: 0,
            //     },
            //     __typename: 'HistogramData',
            //   },
            //   {
            //     x: '2019-02-09T22:00:00.000Z',
            //     y: {
            //       __typename: 'Count',
            //       doc_count: null,
            //       value: 1,
            //     },
            //     __typename: 'HistogramData',
            //   },
            //   {
            //     x: '2019-02-10T01:00:00.000Z',
            //     y: {
            //       __typename: 'Count',
            //       doc_count: null,
            //       value: 1,
            //     },
            //     __typename: 'HistogramData',
            //   },
            // ]);
            // expect(kpiHosts!.authSuccess).to.be(0);
            // expect(kpiHosts!.authSuccessHistogram).to.eql([]);
            // expect(kpiHosts!.authFailure).to.equal(0);
            // expect(kpiHosts!.authFailureHistogram).to.eql([]);
            // expect(kpiHosts!.uniqueSourceIps).to.equal(121);
            // expect(kpiHosts!.uniqueSourceIpsHistogram).to.eql([
            //   {
            //     x: '2019-02-09T16:00:00.000Z',
            //     y: {
            //       __typename: 'Count',
            //       doc_count: null,
            //       value: 52,
            //     },
            //     __typename: 'HistogramData',
            //   },
            //   {
            //     x: '2019-02-09T19:00:00.000Z',
            //     y: {
            //       __typename: 'Count',
            //       doc_count: null,
            //       value: 0,
            //     },
            //     __typename: 'HistogramData',
            //   },
            //   {
            //     x: '2019-02-09T22:00:00.000Z',
            //     y: {
            //       __typename: 'Count',
            //       doc_count: null,
            //       value: 31,
            //     },
            //     __typename: 'HistogramData',
            //   },
            //   {
            //     x: '2019-02-10T01:00:00.000Z',
            //     y: {
            //       __typename: 'Count',
            //       doc_count: null,
            //       value: 88,
            //     },
            //     __typename: 'HistogramData',
            //   },
            // ]);
            // expect(kpiHosts!.uniqueDestinationIps).to.equal(154);
            // expect(kpiHosts!.uniqueDestinationIpsHistogram).to.eql([
            //   {
            //     x: '2019-02-09T16:00:00.000Z',
            //     y: { value: 61, doc_count: null, __typename: 'Count' },
            //     __typename: 'HistogramData',
            //   },
            //   {
            //     x: '2019-02-09T19:00:00.000Z',
            //     y: { value: 0, doc_count: null, __typename: 'Count' },
            //     __typename: 'HistogramData',
            //   },
            //   {
            //     x: '2019-02-09T22:00:00.000Z',
            //     y: { value: 45, doc_count: null, __typename: 'Count' },
            //     __typename: 'HistogramData',
            //   },
            //   {
            //     x: '2019-02-10T01:00:00.000Z',
            //     y: { value: 114, doc_count: null, __typename: 'Count' },
            //     __typename: 'HistogramData',
            //   },
            // ]);
            // });
          });
      });
    });
  });
};
// eslint-disable-next-line import/no-default-export
export default kpiHostsTests;
