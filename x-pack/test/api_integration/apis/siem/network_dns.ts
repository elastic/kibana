/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { networkDnsQuery } from '../../../../plugins/siem/public/containers/network_dns/index.gql_query';
import {
  Direction,
  GetNetworkDnsQuery,
  NetworkDnsFields,
} from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const networkDnsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('Network DNS', () => {
    describe('With packetbeat', () => {
      before(() => esArchiver.load('packetbeat/dns'));
      after(() => esArchiver.unload('packetbeat/dns'));

      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

      it('Make sure that we get Dns data and sorting by uniqueDomains ascending', () => {
        return client
          .query<GetNetworkDnsQuery.Query>({
            query: networkDnsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              isPtrIncluded: false,
              sort: { field: NetworkDnsFields.uniqueDomains, direction: Direction.asc },
              pagination: {
                limit: 10,
                cursor: null,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            },
          })
          .then(resp => {
            const networkDns = resp.data.source.NetworkDns;
            expect(networkDns.edges.length).to.be(10);
            expect(networkDns.totalCount).to.be(44);
            expect(networkDns.edges.map(i => i.node.dnsName).join(',')).to.be(
              'aaplimg.com,adgrx.com,akadns.net,akamaiedge.net,amazonaws.com,cbsistatic.com,cdn-apple.com,connman.net,d1oxlq5h9kq8q5.cloudfront.net,d3epxf4t8a32oh.cloudfront.net'
            );
            expect(networkDns.pageInfo.endCursor!.value).to.equal('10');
          });
      });

      it('Make sure that we get Dns data and sorting by uniqueDomains descending', () => {
        return client
          .query<GetNetworkDnsQuery.Query>({
            query: networkDnsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              isPtrIncluded: false,
              sort: { field: NetworkDnsFields.uniqueDomains, direction: Direction.desc },
              pagination: {
                limit: 10,
                cursor: null,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            },
          })
          .then(resp => {
            const networkDns = resp.data.source.NetworkDns;
            expect(networkDns.edges.length).to.be(10);
            expect(networkDns.totalCount).to.be(44);
            expect(networkDns.edges.map(i => i.node.dnsName).join(',')).to.be(
              'nflxvideo.net,apple.com,netflix.com,samsungcloudsolution.com,samsungqbe.com,samsungelectronics.com,internetat.tv,samsungcloudsolution.net,samsungosp.com,cbsnews.com'
            );
            expect(networkDns.pageInfo.endCursor!.value).to.equal('10');
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default networkDnsTests;
