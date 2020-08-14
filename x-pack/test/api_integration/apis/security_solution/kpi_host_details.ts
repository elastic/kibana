/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { kpiHostDetailsQuery } from '../../../../plugins/security_solution/public/hosts/containers/kpi_host_details/index.gql_query';
import { GetKpiHostDetailsQuery } from '../../../../plugins/security_solution/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');
  describe('Kpi Host Details', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      const FROM = '2000-01-01T00:00:00.000Z';
      const TO = '3000-01-01T00:00:00.000Z';
      const expectedResult = {
        __typename: 'KpiHostDetailsData',
        authSuccess: 0,
        authSuccessHistogram: null,
        authFailure: 0,
        authFailureHistogram: null,
        uniqueSourceIps: 121,
        uniqueSourceIpsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 52,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 31,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 88,
            __typename: 'KpiHostHistogramData',
          },
        ],
        uniqueDestinationIps: 154,
        uniqueDestinationIpsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 61,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 45,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 114,
            __typename: 'KpiHostHistogramData',
          },
        ],
      };

      it('Make sure that we get KpiHostDetails data', () => {
        return client
          .query<GetKpiHostDetailsQuery.Query>({
            query: kpiHostDetailsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              hostName: 'zeek-sensor-san-francisco',
              docValueFields: [],
              inspect: false,
            },
          })
          .then((resp) => {
            const kpiHosts = resp.data.source.KpiHostDetails;
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
        __typename: 'KpiHostDetailsData',
        authSuccess: 0,
        authSuccessHistogram: null,
        authFailure: 0,
        authFailureHistogram: null,
        uniqueSourceIps: 121,
        uniqueSourceIpsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 52,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 31,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 88,
            __typename: 'KpiHostHistogramData',
          },
        ],
        uniqueDestinationIps: 154,
        uniqueDestinationIpsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 61,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 45,
            __typename: 'KpiHostHistogramData',
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 114,
            __typename: 'KpiHostHistogramData',
          },
        ],
      };
      it('Make sure that we get KpiHostDetails data', () => {
        return client
          .query<GetKpiHostDetailsQuery.Query>({
            query: kpiHostDetailsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              docValueFields: [],
              hostName: 'zeek-sensor-san-francisco',
              inspect: false,
            },
          })
          .then((resp) => {
            const kpiHosts = resp.data.source.KpiHostDetails;
            expect(kpiHosts!).to.eql(expectedResult);
          });
      });
    });
  });
}
