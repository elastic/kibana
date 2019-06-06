/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { tlsQuery } from '../../../../plugins/siem/public/containers/tls/index.gql_query';
import {
  Direction,
  TlsFields,
  FlowTarget,
  GetTlsQuery,
} from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

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

const tlsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('Tls Test', () => {
    describe('With packetbeat', () => {
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
                limit: 10,
                cursor: null,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
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
                limit: 10,
                cursor: null,
              },
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
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
  });
};

// eslint-disable-next-line import/no-default-export
export default tlsTests;
