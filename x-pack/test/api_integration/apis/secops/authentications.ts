/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { authenticationsQuery } from '../../../../plugins/secops/public/containers/authentications/index.gql_query';
import { GetAuthenticationsQuery } from '../../../../plugins/secops/public/graphql/types';

import { KbnTestProvider } from './types';

const authenticationsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

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
              to: 1546554465535,
              from: 1483306065535,
            },
            pagination: {
              limit: 1,
              cursor: null,
            },
          },
        })
        .then(resp => {
          const authentications = resp.data.source.Authentications;
          expect(authentications.edges.length).to.be(1);
          expect(authentications.totalCount).to.be(2);
          expect(authentications.pageInfo.endCursor!.value).to.equal('(invalid user)');
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
              to: 1546554465535,
              from: 1483306065535,
            },
            pagination: {
              limit: 2,
              cursor: '(invalid user)',
            },
          },
        })
        .then(resp => {
          const authentications = resp.data.source.Authentications;

          expect(authentications.edges.length).to.be(1);
          expect(authentications.totalCount).to.be(2);
          expect(authentications.edges[0]!.node.lastFailure!.host!.name).to.be('siem-kibana');
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default authenticationsTests;
