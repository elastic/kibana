/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { networkDnsQuery } from '../../../../plugins/security_solution/public/network/containers/network_dns/index.gql_query';
import {
  Direction,
  GetNetworkDnsQuery,
  NetworkDnsFields,
} from '../../../../plugins/security_solution/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');
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
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
              isPtrIncluded: false,
              pagination: {
                activePage: 0,
                cursorStart: 0,
                fakePossibleCount: 30,
                querySize: 10,
              },
              sort: { field: NetworkDnsFields.uniqueDomains, direction: Direction.asc },
              sourceId: 'default',
              stackByField: 'dns.question.registered_domain',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
            },
          })
          .then((resp) => {
            const networkDns = resp.data.source.NetworkDns;
            expect(networkDns.edges.length).to.be(10);
            expect(networkDns.totalCount).to.be(44);
            expect(networkDns.edges.map((i) => i.node.dnsName).join(',')).to.be(
              'aaplimg.com,adgrx.com,akadns.net,akamaiedge.net,amazonaws.com,cbsistatic.com,cdn-apple.com,connman.net,crowbird.com,d1oxlq5h9kq8q5.cloudfront.net'
            );
            expect(networkDns.pageInfo.fakeTotalCount).to.equal(30);
          });
      });

      it('Make sure that we get Dns data and sorting by uniqueDomains descending', () => {
        return client
          .query<GetNetworkDnsQuery.Query>({
            query: networkDnsQuery,
            variables: {
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              isDnsHistogram: false,
              inspect: false,
              isPtrIncluded: false,
              pagination: {
                activePage: 0,
                cursorStart: 0,
                fakePossibleCount: 30,
                querySize: 10,
              },
              sourceId: 'default',
              sort: { field: NetworkDnsFields.uniqueDomains, direction: Direction.desc },
              stackByField: 'dns.question.registered_domain',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
            },
          })
          .then((resp) => {
            const networkDns = resp.data.source.NetworkDns;
            expect(networkDns.edges.length).to.be(10);
            expect(networkDns.totalCount).to.be(44);
            expect(networkDns.edges.map((i) => i.node.dnsName).join(',')).to.be(
              'nflxvideo.net,apple.com,netflix.com,samsungcloudsolution.com,samsungqbe.com,samsungelectronics.com,internetat.tv,samsungcloudsolution.net,samsungosp.com,cbsnews.com'
            );
            expect(networkDns.pageInfo.fakeTotalCount).to.equal(30);
          });
      });
    });
  });
}
