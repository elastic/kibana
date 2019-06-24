/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { GetKpiIpDetailsQuery } from '../../../../legacy/plugins/siem/public/graphql/types';
import { kpiIpDetailsQuery } from '../../../../legacy/plugins/siem/public/containers/kpi_ip_details/index.gql_query';
import { KbnTestProvider } from './types';

const kpiIpDetailsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('KpiIpDetails', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));
      const expected = {
        connections: 31,
        hosts: 1,
        sourcePackets: 1,
        sourcePacketsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 1,
            __typename: 'KpiIpDetailsHistogramData',
          },
        ],
        sourceByte: 74,
        sourceByteHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 74,
            __typename: 'KpiIpDetailsHistogramData',
          },
        ],
        destinationPackets: 37481,
        destinationPacketsHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 5643,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 4751,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 27087,
            __typename: 'KpiIpDetailsHistogramData',
          },
        ],
        destinationByte: 56601724,
        destinationByteHistogram: [
          {
            x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
            y: 8530431,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
            y: 0,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-09T22:00:00.000Z').valueOf(),
            y: 7131226,
            __typename: 'KpiIpDetailsHistogramData',
          },
          {
            x: new Date('2019-02-10T01:00:00.000Z').valueOf(),
            y: 40940067,
            __typename: 'KpiIpDetailsHistogramData',
          },
        ],
        __typename: 'KpiIpDetailsData',
      };
      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();
      it('Make sure that we get KpiIpDetails data', () => {
        return client
          .query<GetKpiIpDetailsQuery.Query>({
            query: kpiIpDetailsQuery,
            variables: {
              sourceId: 'default',
              ip: '151.205.0.17',
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
            },
          })
          .then(resp => {
            const kpiIpDetails = resp.data.source.KpiIpDetails;
            expect(kpiIpDetails).to.eql(expected);
          });
      });
    });

    describe('With packetbeat', () => {
      before(() => esArchiver.load('packetbeat/default'));
      after(() => esArchiver.unload('packetbeat/default'));
      const expected = {
        connections: 1,
        hosts: 1,
        sourcePackets: 0,
        sourcePacketsHistogram: null,
        sourceByte: 0,
        sourceByteHistogram: null,
        destinationPackets: 0,
        destinationPacketsHistogram: [
          {
            x: new Date('2019-02-19T23:22:09.000Z').valueOf(),
            y: 0,
            __typename: 'KpiIpDetailsHistogramData',
          },
        ],
        destinationByte: 0,
        destinationByteHistogram: [
          {
            x: new Date('2019-02-19T23:22:09.000Z').valueOf(),
            y: 0,
            __typename: 'KpiIpDetailsHistogramData',
          },
        ],
        __typename: 'KpiIpDetailsData',
      };
      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();
      it('Make sure that we get KpiIpDetails data', () => {
        return client
          .query<GetKpiIpDetailsQuery.Query>({
            query: kpiIpDetailsQuery,
            variables: {
              sourceId: 'default',
              ip: '185.53.91.88',
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
            },
          })
          .then(resp => {
            const kpiIpDetails = resp.data.source.KpiIpDetails;
            expect(kpiIpDetails).to.eql(expected);
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default kpiIpDetailsTests;
