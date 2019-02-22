/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { networkTopNFlowQuery } from '../../../../plugins/secops/public/containers/network_top_n_flow/index.gql_query';
import {
  GetNetworkTopNFlowQuery,
  NetworkTopNFlowDirection,
  NetworkTopNFlowType,
} from '../../../../plugins/secops/public/graphql/types';
import { KbnTestProvider } from './types';

const EDGE_LENGTH = 10;

const networkTopNFlowTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');
  describe('Network Top N Flow', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      const FROM = new Date('2019-02-09T01:57:24.870Z').valueOf();
      const TO = new Date('2019-02-12T01:57:24.870Z').valueOf();

      it('Make sure that we get unidirectional Source NetworkTopNFlow data', () => {
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
              type: NetworkTopNFlowType.source,
              direction: NetworkTopNFlowDirection.uniDirectional,
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
              type: NetworkTopNFlowType.source,
              direction: NetworkTopNFlowDirection.biDirectional,
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
              type: NetworkTopNFlowType.destination,
              direction: NetworkTopNFlowDirection.uniDirectional,
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
              type: NetworkTopNFlowType.destination,
              direction: NetworkTopNFlowDirection.biDirectional,
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
              type: NetworkTopNFlowType.source,
              direction: NetworkTopNFlowDirection.uniDirectional,
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
              type: NetworkTopNFlowType.client,
              direction: NetworkTopNFlowDirection.biDirectional,
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
              type: NetworkTopNFlowType.server,
              direction: NetworkTopNFlowDirection.biDirectional,
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

// tslint:disable-next-line no-default-export
export default networkTopNFlowTests;
