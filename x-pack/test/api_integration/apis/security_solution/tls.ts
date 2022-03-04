/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  NetworkQueries,
  Direction,
  NetworkTlsFields,
  FlowTarget,
  NetworkTlsStrategyResponse,
} from '../../../../plugins/security_solution/common/search_strategy';

import { FtrProviderContext } from '../../ftr_provider_context';

const FROM = '2000-01-01T00:00:00.000Z';
const TO = '3000-01-01T00:00:00.000Z';
const SOURCE_IP = '10.128.0.35';
const DESTINATION_IP = '74.125.129.95';

const expectedResult = {
  _id: '16989191B1A93ECECD5FE9E63EBD4B5C3B606D26',
  subjects: ['CN=edgecert.googleapis.com,O=Google LLC,L=Mountain View,ST=California,C=US'],
  issuers: ['CN=GTS CA 1O1,O=Google Trust Services,C=US'],
  ja3: ['bd12d76eb0b6787e6a78a14d2ff96c2b'],
  notAfter: ['2020-05-06T11:52:15.000Z'],
};

const expectedOverviewDestinationResult = {
  edges: [
    {
      cursor: {
        tiebreaker: null,
        value: 'EB4E81DD7C55BA9715652ECF5647FB8877E55A8F',
      },
      node: {
        _id: 'EB4E81DD7C55BA9715652ECF5647FB8877E55A8F',
        subjects: [
          'CN=*.cdn.mozilla.net,OU=Cloud Services,O=Mozilla Corporation,L=Mountain View,ST=California,C=US',
        ],
        issuers: ['CN=DigiCert SHA2 Secure Server CA,O=DigiCert Inc,C=US'],
        ja3: ['b20b44b18b853ef29ab773e921b03422'],
        notAfter: ['2020-12-09T12:00:00.000Z'],
      },
    },
  ],
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 3,
    showMorePagesIndicator: false,
  },
  totalCount: 3,
};

const expectedOverviewSourceResult = {
  edges: [
    {
      cursor: {
        tiebreaker: null,
        value: 'EB4E81DD7C55BA9715652ECF5647FB8877E55A8F',
      },
      node: {
        _id: 'EB4E81DD7C55BA9715652ECF5647FB8877E55A8F',
        subjects: [
          'CN=*.cdn.mozilla.net,OU=Cloud Services,O=Mozilla Corporation,L=Mountain View,ST=California,C=US',
        ],
        issuers: ['CN=DigiCert SHA2 Secure Server CA,O=DigiCert Inc,C=US'],
        ja3: ['b20b44b18b853ef29ab773e921b03422'],
        notAfter: ['2020-12-09T12:00:00.000Z'],
      },
    },
  ],
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 3,
    showMorePagesIndicator: false,
  },
  totalCount: 3,
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const bsearch = getService('bsearch');

  describe('Tls Test with Packetbeat', () => {
    describe('Tls Test', () => {
      before(
        async () => await esArchiver.load('x-pack/test/functional/es_archives/packetbeat/tls')
      );
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/packetbeat/tls')
      );

      it('Ensure data is returned for FlowTarget.Source', async () => {
        const tls = await bsearch.send<NetworkTlsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkQueries.tls,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            ip: SOURCE_IP,
            flowTarget: FlowTarget.source,
            sort: { field: NetworkTlsFields._id, direction: Direction.desc },
            pagination: {
              activePage: 0,
              cursorStart: 0,
              fakePossibleCount: 30,
              querySize: 10,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(tls.edges.length).to.be(1);
        expect(tls.totalCount).to.be(1);
        expect(tls.edges[0].node).to.eql(expectedResult);
      });

      it('Ensure data is returned for FlowTarget.Destination', async () => {
        const tls = await bsearch.send<NetworkTlsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkQueries.tls,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            ip: DESTINATION_IP,
            flowTarget: FlowTarget.destination,
            sort: { field: NetworkTlsFields._id, direction: Direction.desc },
            pagination: {
              activePage: 0,
              cursorStart: 0,
              fakePossibleCount: 30,
              querySize: 10,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(tls.edges.length).to.be(1);
        expect(tls.totalCount).to.be(1);
        expect(tls.edges[0].node).to.eql(expectedResult);
      });
    });

    describe('Tls Overview Test', () => {
      before(
        async () => await esArchiver.load('x-pack/test/functional/es_archives/packetbeat/tls')
      );
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/packetbeat/tls')
      );

      it('Ensure data is returned for FlowTarget.Source', async () => {
        const tls = await bsearch.send<NetworkTlsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkQueries.tls,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            ip: '',
            flowTarget: FlowTarget.source,
            sort: { field: NetworkTlsFields._id, direction: Direction.desc },
            pagination: {
              activePage: 0,
              cursorStart: 0,
              fakePossibleCount: 30,
              querySize: 10,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(tls.pageInfo).to.eql(expectedOverviewSourceResult.pageInfo);
        expect(tls.edges[0]).to.eql(expectedOverviewSourceResult.edges[0]);
      });

      it('Ensure data is returned for FlowTarget.Destination', async () => {
        const tls = await bsearch.send<NetworkTlsStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkQueries.tls,
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            ip: '',
            flowTarget: FlowTarget.destination,
            sort: { field: NetworkTlsFields._id, direction: Direction.desc },
            pagination: {
              activePage: 0,
              cursorStart: 0,
              fakePossibleCount: 30,
              querySize: 10,
            },
            defaultIndex: ['packetbeat-*'],
            docValueFields: [],
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });

        expect(tls.pageInfo).to.eql(expectedOverviewDestinationResult.pageInfo);
        expect(tls.edges[0]).to.eql(expectedOverviewDestinationResult.edges[0]);
      });
    });
  });
}
