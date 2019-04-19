/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { networkTopNFlowQuery } from '../../../../plugins/siem/public/containers/network_top_n_flow/index.gql_query';
import {
  Direction,
  FlowDirection,
  FlowTarget,
  GetNetworkTopNFlowQuery,
  NetworkTopNFlowFields,
} from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const EDGE_LENGTH = 10;

const networkTopNFlowTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('Network Top N Flow', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      const FROM = new Date('2019-02-09T01:57:24.870Z').valueOf();
      const TO = new Date('2019-02-12T01:57:24.870Z').valueOf();

      it('Make sure that we get unidirectional Source NetworkTopNFlow data with bytes descending sort', () => {
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
              flowTarget: FlowTarget.source,
              sort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
              flowDirection: FlowDirection.uniDirectional,
              pagination: {
                limit: 10,
                cursor: null,
              },
            },
          })
          .then(resp => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;
            expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
            expect(networkTopNFlow.totalCount).to.be(121);
            expect(networkTopNFlow.edges.map(i => i.node.source!.ip).join(',')).to.be(
              '8.250.107.245,10.100.7.198,8.248.211.247,8.253.157.240,151.205.0.21,8.254.254.117,54.239.220.40,151.205.0.23,8.248.223.246,151.205.0.17'
            );
            expect(networkTopNFlow.edges[0].node.destination).to.be(null);
            expect(networkTopNFlow.pageInfo.endCursor!.value).to.equal('10');
          });
      });

      it('Make sure that we get unidirectional Source NetworkTopNFlow data with bytes ascending sort ', () => {
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
              flowTarget: FlowTarget.source,
              sort: { field: NetworkTopNFlowFields.bytes, direction: Direction.asc },
              flowDirection: FlowDirection.uniDirectional,
              pagination: {
                limit: 10,
                cursor: null,
              },
            },
          })
          .then(resp => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;
            expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
            expect(networkTopNFlow.totalCount).to.be(121);
            expect(networkTopNFlow.edges.map(i => i.node.source!.ip).join(',')).to.be(
              '10.100.4.1,54.239.219.220,54.239.219.228,54.239.220.94,54.239.220.138,54.239.220.184,54.239.220.186,54.239.221.253,35.167.45.163,52.5.171.20'
            );
            expect(networkTopNFlow.edges[0].node.destination).to.be(null);
            expect(networkTopNFlow.pageInfo.endCursor!.value).to.equal('10');
          });
      });

      it('Make sure that we get bidirectional Source NetworkTopNFlow data', () => {
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
              sort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
              flowTarget: FlowTarget.source,
              flowDirection: FlowDirection.biDirectional,
              pagination: {
                limit: 10,
                cursor: null,
              },
            },
          })
          .then(resp => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;
            expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
            expect(networkTopNFlow.totalCount).to.be(10);
            expect(networkTopNFlow.edges[0].node.destination).to.be(null);
            expect(networkTopNFlow.pageInfo.endCursor!.value).to.equal('10');
          });
      });

      it('Make sure that we get unidirectional Destination NetworkTopNFlow data', () => {
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
              sort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
              flowTarget: FlowTarget.destination,
              flowDirection: FlowDirection.uniDirectional,
              pagination: {
                limit: 10,
                cursor: null,
              },
            },
          })
          .then(resp => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;
            expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
            expect(networkTopNFlow.totalCount).to.be(144);
            expect(networkTopNFlow.edges[0].node.source).to.be(null);
            expect(networkTopNFlow.pageInfo.endCursor!.value).to.equal('10');
          });
      });

      it('Make sure that we get bidirectional Destination NetworkTopNFlow data', () => {
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
              sort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
              flowTarget: FlowTarget.destination,
              flowDirection: FlowDirection.biDirectional,
              pagination: {
                limit: 10,
                cursor: null,
              },
            },
          })
          .then(resp => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;
            expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
            expect(networkTopNFlow.totalCount).to.be(89);
            expect(networkTopNFlow.edges[0].node.source).to.be(null);
            expect(networkTopNFlow.pageInfo.endCursor!.value).to.equal('10');
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
              sort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
              flowTarget: FlowTarget.source,
              flowDirection: FlowDirection.uniDirectional,
              pagination: {
                limit: 20,
                cursor: 10,
              },
            },
          })
          .then(resp => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;

            expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
            expect(networkTopNFlow.totalCount).to.be(121);
            expect(networkTopNFlow.edges[0].node.source!.ip).to.be('151.205.0.19');
          });
      });
    });

    describe('With packetbeat', () => {
      before(() => esArchiver.load('packetbeat/default'));
      after(() => esArchiver.unload('packetbeat/default'));

      const FROM = new Date('2019-02-19T23:22:09.675Z').valueOf();
      const TO = new Date('2019-02-19T23:26:50.001Z').valueOf();

      it('Make sure that we get bidirectional Client NetworkTopNFlow data', () => {
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
              sort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
              flowTarget: FlowTarget.client,
              flowDirection: FlowDirection.biDirectional,
              pagination: {
                limit: 10,
                cursor: null,
              },
            },
          })
          .then(resp => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;
            expect(networkTopNFlow.edges.length).to.be(1);
            expect(networkTopNFlow.totalCount).to.be(1);
            expect(networkTopNFlow.edges[0].node.server).to.be(null);
            expect(networkTopNFlow.pageInfo.endCursor!.value).to.equal('10');
          });
      });

      it('Make sure that we get bidirectional Server NetworkTopNFlow data', () => {
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
              sort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
              flowTarget: FlowTarget.server,
              flowDirection: FlowDirection.biDirectional,
              pagination: {
                limit: 10,
                cursor: null,
              },
            },
          })
          .then(resp => {
            const networkTopNFlow = resp.data.source.NetworkTopNFlow;
            expect(networkTopNFlow.edges.length).to.be(1);
            expect(networkTopNFlow.totalCount).to.be(1);
            expect(networkTopNFlow.edges[0].node.client).to.be(null);
            expect(networkTopNFlow.pageInfo.endCursor!.value).to.equal('10');
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default networkTopNFlowTests;
