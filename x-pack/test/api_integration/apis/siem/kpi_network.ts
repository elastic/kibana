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
      const expectedResult = {
        __typename: 'KpiNetworkData',
        networkEvents: 6157,
        uniqueFlowId: 712,
        uniqueSourcePrivateIps: 8,
        uniqueSourcePrivateIpsHistogram: [
          {
            x: '2019-02-09T16:00:00.000Z',
            y: 8,
            __typename: 'KpiNetworkHistogramData',
          },
          {
            x: '2019-02-09T19:00:00.000Z',
            y: 0,
            __typename: 'KpiNetworkHistogramData',
          },
          {
            x: '2019-02-09T22:00:00.000Z',
            y: 8,
            __typename: 'KpiNetworkHistogramData',
          },
          {
            x: '2019-02-10T01:00:00.000Z',
            y: 7,
            __typename: 'KpiNetworkHistogramData',
          },
        ],
        uniqueDestinationPrivateIps: 9,
        uniqueDestinationPrivateIpsHistogram: [
          {
            __typename: 'KpiNetworkHistogramData',
            x: '2019-02-09T16:00:00.000Z',
            y: 8,
          },
          {
            __typename: 'KpiNetworkHistogramData',
            x: '2019-02-09T19:00:00.000Z',
            y: 0,
          },
          {
            __typename: 'KpiNetworkHistogramData',
            x: '2019-02-09T22:00:00.000Z',
            y: 8,
          },
          {
            __typename: 'KpiNetworkHistogramData',
            x: '2019-02-10T01:00:00.000Z',
            y: 8,
          },
        ],
        dnsQueries: 169,
        tlsHandshakes: 62,
      };

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
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            },
          })
          .then(resp => {
            const kpiNetwork = resp.data.source.KpiNetwork;
            expect(kpiNetwork).to.eql(expectedResult);
          });
      });
    });

    describe('With packetbeat', () => {
      before(() => esArchiver.load('packetbeat/default'));
      after(() => esArchiver.unload('packetbeat/default'));

      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();
      const expectedResult = {
        __typename: 'KpiNetworkData',
        networkEvents: 6157,
        uniqueFlowId: 712,
        uniqueSourcePrivateIps: 8,
        uniqueSourcePrivateIpsHistogram: [
          {
            x: '2019-02-09T16:00:00.000Z',
            y: 8,
            __typename: 'KpiNetworkHistogramData',
          },
          {
            x: '2019-02-09T19:00:00.000Z',
            y: 0,
            __typename: 'KpiNetworkHistogramData',
          },
          {
            x: '2019-02-09T22:00:00.000Z',
            y: 8,
            __typename: 'KpiNetworkHistogramData',
          },
          {
            x: '2019-02-10T01:00:00.000Z',
            y: 7,
            __typename: 'KpiNetworkHistogramData',
          },
        ],
        uniqueDestinationPrivateIps: 9,
        uniqueDestinationPrivateIpsHistogram: [
          {
            __typename: 'KpiNetworkHistogramData',
            x: '2019-02-09T16:00:00.000Z',
            y: 8,
          },
          {
            __typename: 'KpiNetworkHistogramData',
            x: '2019-02-09T19:00:00.000Z',
            y: 0,
          },
          {
            __typename: 'KpiNetworkHistogramData',
            x: '2019-02-09T22:00:00.000Z',
            y: 8,
          },
          {
            __typename: 'KpiNetworkHistogramData',
            x: '2019-02-10T01:00:00.000Z',
            y: 8,
          },
        ],
        dnsQueries: 169,
        tlsHandshakes: 62,
      };
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
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            },
          })
          .then(resp => {
            const kpiNetwork = resp.data.source.KpiNetwork;
            expect(kpiNetwork).to.eql(expectedResult);
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default kpiNetworkTests;
