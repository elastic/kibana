/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { authenticationsQuery } from '../../../../plugins/siem/public/containers/authentications/index.gql_query';
import { GetAuthenticationsQuery } from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

// typical values that have to change after an update from "scripts/es_archiver"
const HOST_NAME = 'zeek-newyork-sha-aa8df15';
const TOTAL_COUNT = 3;
const EDGE_LENGTH = 1;

const authenticationsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');

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
              limit: 1,
              cursor: null,
            },
          },
        })
        .then(resp => {
          const authentications = resp.data.source.Authentications;
          expect(authentications.edges.length).to.be(EDGE_LENGTH);
          expect(authentications.totalCount).to.be(TOTAL_COUNT);
          expect(authentications.pageInfo.endCursor!.value).to.equal('1');
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
              limit: 2,
              cursor: '1',
            },
          },
        })
        .then(resp => {
          const authentications = resp.data.source.Authentications;
          expect(authentications.edges.length).to.be(EDGE_LENGTH);
          expect(authentications.totalCount).to.be(TOTAL_COUNT);
          expect(authentications.edges[0]!.node.lastSuccess!.host!.name).to.eql([HOST_NAME]);
        });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default authenticationsTests;
