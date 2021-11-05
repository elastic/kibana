/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  NetworkQueries,
  NetworkTopNFlowEdges,
  Direction,
  FlowTargetSourceDest,
  NetworkTopTablesFields,
  NetworkTopNFlowStrategyResponse,
} from '../../../../plugins/security_solution/common/search_strategy';

import { FtrProviderContext } from '../../ftr_provider_context';

const EDGE_LENGTH = 10;

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const bsearch = getService('bsearch');

  describe('Network Top N Flow', () => {
    describe('With filebeat', () => {
      before(
        async () => await esArchiver.load('x-pack/test/functional/es_archives/filebeat/default')
      );
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/filebeat/default')
      );

      const FROM = '2019-02-09T01:57:24.870Z';
      const TO = '2019-02-12T01:57:24.870Z';

      it('Make sure that we get Source NetworkTopNFlow data with bytes_in descending sort', async () => {
        const networkTopNFlow = await bsearch.send<NetworkTopNFlowStrategyResponse>({
          supertest,
          options: {
            defaultIndex: ['filebeat-*'],
            factoryQueryType: NetworkQueries.topNFlow,
            flowTarget: FlowTargetSourceDest.source,
            sort: { field: NetworkTopTablesFields.bytes_in, direction: Direction.desc },
            pagination: {
              activePage: 0,
              cursorStart: 0,
              fakePossibleCount: 50,
              querySize: 10,
            },
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
        expect(networkTopNFlow.totalCount).to.be(121);
        expect(
          networkTopNFlow.edges.map((i: NetworkTopNFlowEdges) => i.node.source!.ip).join(',')
        ).to.be(
          '10.100.7.196,10.100.7.199,10.100.7.197,10.100.7.198,3.82.33.170,17.249.172.100,10.100.4.1,8.248.209.244,8.248.211.247,8.248.213.244'
        );
        expect(networkTopNFlow.edges[0].node.destination).to.be(undefined);
        expect(networkTopNFlow.edges[0].node.source!.flows).to.be(498);
        expect(networkTopNFlow.edges[0].node.source!.destination_ips).to.be(132);
        expect(networkTopNFlow.pageInfo.fakeTotalCount).to.equal(50);
      });

      it('Make sure that we get Source NetworkTopNFlow data with bytes_in ascending sort ', async () => {
        const networkTopNFlow = await bsearch.send<NetworkTopNFlowStrategyResponse>({
          supertest,
          options: {
            defaultIndex: ['filebeat-*'],
            factoryQueryType: 'topNFlow',
            filterQuery:
              '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
            flowTarget: FlowTargetSourceDest.source,
            sort: { field: NetworkTopTablesFields.bytes_in, direction: Direction.asc },
            pagination: {
              activePage: 0,
              cursorStart: 0,
              fakePossibleCount: 50,
              querySize: 10,
            },
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
        expect(networkTopNFlow.totalCount).to.be(121);
        expect(
          networkTopNFlow.edges.map((i: NetworkTopNFlowEdges) => i.node.source!.ip).join(',')
        ).to.be(
          '8.248.209.244,8.248.211.247,8.248.213.244,8.248.223.246,8.250.107.245,8.250.121.236,8.250.125.244,8.253.38.231,8.253.157.112,8.253.157.240'
        );
        expect(networkTopNFlow.edges[0].node.destination).to.be(undefined);
        expect(networkTopNFlow.edges[0].node.source!.flows).to.be(12);
        expect(networkTopNFlow.edges[0].node.source!.destination_ips).to.be(1);
        expect(networkTopNFlow.pageInfo.fakeTotalCount).to.equal(50);
      });

      it('Make sure that we get Destination NetworkTopNFlow data', async () => {
        const networkTopNFlow = await bsearch.send<NetworkTopNFlowStrategyResponse>({
          supertest,
          options: {
            defaultIndex: ['filebeat-*'],
            factoryQueryType: 'topNFlow',
            filterQuery:
              '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
            sort: { field: NetworkTopTablesFields.bytes_in, direction: Direction.desc },
            flowTarget: FlowTargetSourceDest.destination,
            pagination: {
              activePage: 0,
              cursorStart: 0,
              fakePossibleCount: 50,
              querySize: 10,
            },
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
        expect(networkTopNFlow.totalCount).to.be(154);
        expect(networkTopNFlow.edges[0].node.destination!.flows).to.be(19);
        expect(networkTopNFlow.edges[0].node.destination!.source_ips).to.be(1);
        expect(networkTopNFlow.edges[0].node.source).to.be(undefined);
        expect(networkTopNFlow.pageInfo.fakeTotalCount).to.equal(50);
      });

      it('Make sure that pagination is working in NetworkTopNFlow query', async () => {
        const networkTopNFlow = await bsearch.send<NetworkTopNFlowStrategyResponse>({
          supertest,
          options: {
            defaultIndex: ['filebeat-*'],
            factoryQueryType: 'topNFlow',
            filterQuery:
              '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
            sort: { field: NetworkTopTablesFields.bytes_in, direction: Direction.desc },
            flowTarget: FlowTargetSourceDest.source,
            pagination: {
              activePage: 1,
              cursorStart: 10,
              fakePossibleCount: 50,
              querySize: 20,
            },
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(networkTopNFlow.edges.length).to.be(EDGE_LENGTH);
        expect(networkTopNFlow.totalCount).to.be(121);
        expect(networkTopNFlow.edges[0].node.source!.ip).to.be('8.248.223.246');
      });
    });
  });
}
