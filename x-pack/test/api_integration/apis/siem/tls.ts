/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { tlsQuery } from '../../../../legacy/plugins/siem/public/containers/tls/index.gql_query';
import {
  Direction,
  TlsFields,
  FlowTarget,
  GetTlsQuery,
} from '../../../../legacy/plugins/siem/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();
const SOURCE_IP = '157.230.208.30';
const DESTINATION_IP = '91.189.92.20';

const expectedResult = {
  __typename: 'TlsNode',
  _id: '61749734b3246f1584029deb4f5276c64da00ada',
  alternativeNames: ['api.snapcraft.io'],
  commonNames: ['api.snapcraft.io'],
  issuerNames: ['DigiCert SHA2 Secure Server CA'],
  ja3: ['839868ad711dc55bde0d37a87f14740d'],
  notAfter: ['2019-05-22T12:00:00.000Z'],
};

const expectedOverviewDestinationResult = {
  __typename: 'TlsData',
  edges: [
    {
      __typename: 'TlsEdges',
      cursor: {
        __typename: 'CursorType',
        value: '61749734b3246f1584029deb4f5276c64da00ada',
      },
      node: {
        __typename: 'TlsNode',
        _id: '61749734b3246f1584029deb4f5276c64da00ada',
        alternativeNames: ['api.snapcraft.io'],
        commonNames: ['api.snapcraft.io'],
        issuerNames: ['DigiCert SHA2 Secure Server CA'],
        ja3: ['839868ad711dc55bde0d37a87f14740d'],
        notAfter: ['2019-05-22T12:00:00.000Z'],
      },
    },
  ],
  pageInfo: {
    __typename: 'PageInfoPaginated',
    activePage: 0,
    fakeTotalCount: 1,
    showMorePagesIndicator: false,
  },
  totalCount: 1,
};
const expectedOverviewSourceResult = {
  __typename: 'TlsData',
  edges: [
    {
      __typename: 'TlsEdges',
      cursor: {
        __typename: 'CursorType',
        value: '61749734b3246f1584029deb4f5276c64da00ada',
      },
      node: {
        __typename: 'TlsNode',
        _id: '61749734b3246f1584029deb4f5276c64da00ada',
        alternativeNames: ['api.snapcraft.io'],
        commonNames: ['api.snapcraft.io'],
        issuerNames: ['DigiCert SHA2 Secure Server CA'],
        ja3: ['839868ad711dc55bde0d37a87f14740d'],
        notAfter: ['2019-05-22T12:00:00.000Z'],
      },
    },
  ],
  pageInfo: {
    __typename: 'PageInfoPaginated',
    activePage: 0,
    fakeTotalCount: 1,
    showMorePagesIndicator: false,
  },
  totalCount: 1,
};

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('Tls Test with Packetbeat', () => {
    describe('Tls Test', () => {
      before(() => esArchiver.load('packetbeat/default'));
      after(() => esArchiver.unload('packetbeat/default'));

      it('Ensure data is returned for FlowTarget.Source', () => {
        return client
          .query<GetTlsQuery.Query>({
            query: tlsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              ip: SOURCE_IP,
              flowTarget: FlowTarget.source,
              sort: { field: TlsFields._id, direction: Direction.desc },
              pagination: {
                activePage: 0,
                cursorStart: 0,
                fakePossibleCount: 30,
                querySize: 10,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then(resp => {
            const tls = resp.data.source.Tls;
            expect(tls.edges.length).to.be(1);
            expect(tls.totalCount).to.be(1);
            expect(tls.edges[0].node).to.eql(expectedResult);
          });
      });

      it('Ensure data is returned for FlowTarget.Destination', () => {
        return client
          .query<GetTlsQuery.Query>({
            query: tlsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              ip: DESTINATION_IP,
              flowTarget: FlowTarget.destination,
              sort: { field: TlsFields._id, direction: Direction.desc },
              pagination: {
                activePage: 0,
                cursorStart: 0,
                fakePossibleCount: 30,
                querySize: 10,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then(resp => {
            const tls = resp.data.source.Tls;
            expect(tls.edges.length).to.be(1);
            expect(tls.totalCount).to.be(1);
            expect(tls.edges[0].node).to.eql(expectedResult);
          });
      });
    });

    describe('Tls Overview Test', () => {
      before(() => esArchiver.load('packetbeat/default'));
      after(() => esArchiver.unload('packetbeat/default'));

      it('Ensure data is returned for FlowTarget.Source', () => {
        return client
          .query<GetTlsQuery.Query>({
            query: tlsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              ip: '',
              flowTarget: FlowTarget.source,
              sort: { field: TlsFields._id, direction: Direction.desc },
              pagination: {
                activePage: 0,
                cursorStart: 0,
                fakePossibleCount: 30,
                querySize: 10,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then(resp => {
            const tls = resp.data.source.Tls;
            expect(tls).to.eql(expectedOverviewSourceResult);
          });
      });

      it('Ensure data is returned for FlowTarget.Destination', () => {
        return client
          .query<GetTlsQuery.Query>({
            query: tlsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              ip: '',
              flowTarget: FlowTarget.destination,
              sort: { field: TlsFields._id, direction: Direction.desc },
              pagination: {
                activePage: 0,
                cursorStart: 0,
                fakePossibleCount: 30,
                querySize: 10,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then(resp => {
            const tls = resp.data.source.Tls;
            expect(tls).to.eql(expectedOverviewDestinationResult);
          });
      });
    });
  });
}
