/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { networkTopNFlowQuery } from '../../../../plugins/security_solution/public/network/containers/network_top_n_flow/index.gql_query';
import {
  Direction,
  FlowTargetSourceDest,
  GetNetworkTopNFlowQuery,
  NetworkTopTablesFields,
} from '../../../../plugins/security_solution/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

const EDGE_LENGTH = 10;

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');
  describe('Network Top N Flow', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      const FROM = new Date('2019-02-09T01:57:24.870Z').valueOf();
      const TO = new Date('2019-02-12T01:57:24.870Z').valueOf();

      it('Make sure that we get Source NetworkTopNFlow data with bytes_in descending sort', () => {
        return client
          .query<GetNetworkTopNFlowQuery.Query>({
            query: networkTopNFlowQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              flowTarget: FlowTargetSourceDest.source,
              sort: { field: NetworkTopTablesFields.bytes_in, direction: Direction.desc },
              pagination: {
                activePage: 0,
                cursorStart: 0,
                fakePossibleCount: 50,
                querySize: 10,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then((resp) => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;
            expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
            expect(networkTopNFlow.totalCount).to.be(121);
            expect(networkTopNFlow.edges.map((i) => i.node.source!.ip).join(',')).to.be(
              '10.100.7.196,10.100.7.199,10.100.7.197,10.100.7.198,3.82.33.170,17.249.172.100,10.100.4.1,8.248.209.244,8.248.211.247,8.248.213.244'
            );
            expect(networkTopNFlow.edges[0].node.destination).to.be(null);
            expect(networkTopNFlow.edges[0].node.source!.flows).to.be(498);
            expect(networkTopNFlow.edges[0].node.source!.destination_ips).to.be(132);
            expect(networkTopNFlow.pageInfo.fakeTotalCount).to.equal(50);
          });
      });

      it('Make sure that we get Source NetworkTopNFlow data with bytes_in ascending sort ', () => {
        return client
          .query<GetNetworkTopNFlowQuery.Query>({
            query: networkTopNFlowQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              flowTarget: FlowTargetSourceDest.source,
              sort: { field: NetworkTopTablesFields.bytes_in, direction: Direction.asc },
              pagination: {
                activePage: 0,
                cursorStart: 0,
                fakePossibleCount: 50,
                querySize: 10,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then((resp) => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;
            expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
            expect(networkTopNFlow.totalCount).to.be(121);
            expect(networkTopNFlow.edges.map((i) => i.node.source!.ip).join(',')).to.be(
              '8.248.209.244,8.248.211.247,8.248.213.244,8.248.223.246,8.250.107.245,8.250.121.236,8.250.125.244,8.253.38.231,8.253.157.112,8.253.157.240'
            );
            expect(networkTopNFlow.edges[0].node.destination).to.be(null);
            expect(networkTopNFlow.edges[0].node.source!.flows).to.be(12);
            expect(networkTopNFlow.edges[0].node.source!.destination_ips).to.be(1);
            expect(networkTopNFlow.pageInfo.fakeTotalCount).to.equal(50);
          });
      });

      it('Make sure that we get Destination NetworkTopNFlow data', () => {
        return client
          .query<GetNetworkTopNFlowQuery.Query>({
            query: networkTopNFlowQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              sort: { field: NetworkTopTablesFields.bytes_in, direction: Direction.desc },
              flowTarget: FlowTargetSourceDest.destination,
              pagination: {
                activePage: 0,
                cursorStart: 0,
                fakePossibleCount: 50,
                querySize: 10,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then((resp) => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;
            expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
            expect(networkTopNFlow.totalCount).to.be(154);
            expect(networkTopNFlow.edges[0].node.destination!.flows).to.be(19);
            expect(networkTopNFlow.edges[0].node.destination!.source_ips).to.be(1);
            expect(networkTopNFlow.edges[0].node.source).to.be(null);
            expect(networkTopNFlow.pageInfo.fakeTotalCount).to.equal(50);
          });
      });

      it('Make sure that pagination is working in NetworkTopNFlow query', () => {
        return client
          .query<GetNetworkTopNFlowQuery.Query>({
            query: networkTopNFlowQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              sort: { field: NetworkTopTablesFields.bytes_in, direction: Direction.desc },
              flowTarget: FlowTargetSourceDest.source,
              pagination: {
                activePage: 1,
                cursorStart: 10,
                fakePossibleCount: 50,
                querySize: 20,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then((resp) => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;

            expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
            expect(networkTopNFlow.totalCount).to.be(121);
            expect(networkTopNFlow.edges[0].node.source!.ip).to.be('8.248.223.246');
          });
      });
    });
  });
}
