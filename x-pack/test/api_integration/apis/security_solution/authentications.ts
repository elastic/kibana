/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { authenticationsQuery } from '../../../../plugins/security_solution/public/hosts/containers/authentications/index.gql_query';
import { GetAuthenticationsQuery } from '../../../../plugins/security_solution/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

const FROM = '2000-01-01T00:00:00.000Z';
const TO = '3000-01-01T00:00:00.000Z';

// typical values that have to change after an update from "scripts/es_archiver"
const HOST_NAME = 'zeek-newyork-sha-aa8df15';
const TOTAL_COUNT = 3;
const EDGE_LENGTH = 1;

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');

  describe('authentications', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get Authentication data', () => {
      return client
        .query<GetAuthenticationsQuery.Query>({
          query: authenticationsQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            pagination: {
              activePage: 0,
              cursorStart: 0,
              fakePossibleCount: 3,
              querySize: 1,
            },
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            docValueFields: [],
            inspect: false,
          },
        })
        .then((resp) => {
          const authentications = resp.data.source.Authentications;
          expect(authentications.edges.length).to.be(EDGE_LENGTH);
          expect(authentications.totalCount).to.be(TOTAL_COUNT);
          expect(authentications.pageInfo.fakeTotalCount).to.equal(3);
        });
    });

    it('Make sure that pagination is working in Authentications query', () => {
      return client
        .query<GetAuthenticationsQuery.Query>({
          query: authenticationsQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            pagination: {
              activePage: 2,
              cursorStart: 1,
              fakePossibleCount: 5,
              querySize: 2,
            },
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            docValueFields: [],
            inspect: false,
          },
        })
        .then((resp) => {
          const authentications = resp.data.source.Authentications;
          expect(authentications.edges.length).to.be(EDGE_LENGTH);
          expect(authentications.totalCount).to.be(TOTAL_COUNT);
          expect(authentications.edges[0]!.node.lastSuccess!.host!.name).to.eql([HOST_NAME]);
        });
    });
  });
}
