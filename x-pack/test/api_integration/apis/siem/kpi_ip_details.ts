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
        __typename: 'KpiIpDetailsData',
        sourceByte: 27044769,
        destinationByte: 953220875,
        topSourceIp: '10.100.7.196',
        topDestinationIp: '8.248.211.247',
        topSourceIpTransportBytes: 27033419,
        topDestinationIpTransportBytes: 101387911,
        topDestinationPort: 80,
        topTransport: 'tcp',
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
        __typename: 'KpiIpDetailsData',
        sourceByte: 27044769,
        destinationByte: 953220875,
        topSourceIp: '10.100.7.196',
        topDestinationIp: '8.248.211.247',
        topSourceIpTransportBytes: 27033419,
        topDestinationIpTransportBytes: 101387911,
        topDestinationPort: 80,
        topTransport: 'tcp',
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
