/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { networkTopNFlowQuery } from '../../../../plugins/secops/public/containers/network_top_n_flow/index.gql_query';
import {
  GetNetworkTopNFlowQuery,
  NetworkTopNFlowType,
} from '../../../../plugins/secops/public/graphql/types';

import { KbnTestProvider } from './types';

const networkTopNFlowTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

  describe('Network Top N Flow', () => {
    before(() => esArchiver.load('filebeat/default'));
    after(() => esArchiver.unload('filebeat/default'));

    it('Make sure that we get Source NetworkTopNFlow data', () => {
      return client
        .query<GetNetworkTopNFlowQuery.Query>({
          query: networkTopNFlowQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: 1549936644870,
              from: 1549677444870,
            },
            type: NetworkTopNFlowType.source,
            pagination: {
              limit: 10,
              cursor: null,
            },
          },
        })
        .then(resp => {
          const networkTopNFlow = resp.data.source.NetworkTopNFlow;
          expect(networkTopNFlow.edges.length).to.be(10);
          expect(networkTopNFlow.totalCount).to.be(121);
          expect(networkTopNFlow.edges[0].node.destination).to.be(null);
          expect(networkTopNFlow.pageInfo.endCursor!.value).to.equal('10');
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
              to: 1549936644870,
              from: 1549677444870,
            },
            type: NetworkTopNFlowType.destination,
            pagination: {
              limit: 10,
              cursor: null,
            },
          },
        })
        .then(resp => {
          const networkTopNFlow = resp.data.source.NetworkTopNFlow;
          expect(networkTopNFlow.edges.length).to.be(10);
          expect(networkTopNFlow.totalCount).to.be(154);
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
              to: 1549936644870,
              from: 1549677444870,
            },
            type: NetworkTopNFlowType.source,
            pagination: {
              limit: 20,
              cursor: 10,
            },
          },
        })
        .then(resp => {
          const networkTopNFlow = resp.data.source.NetworkTopNFlow;

          expect(networkTopNFlow.edges.length).to.be(10);
          expect(networkTopNFlow.totalCount).to.be(121);
          expect(networkTopNFlow.edges[0].node.source!.ip).to.be('151.205.0.17');
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default networkTopNFlowTests;
