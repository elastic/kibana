/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { authorizationsQuery } from '../../../../plugins/secops/public/containers/authorizations/index.gql_query';
import { GetAuthorizationsQuery } from '../../../../plugins/secops/public/graphql/types';

import { KbnTestProvider } from './types';

const authorizationsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

  describe('authorizations', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get Authorizations data', () => {
      return client
        .query<GetAuthorizationsQuery.Query>({
          query: authorizationsQuery,
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
          const authorizations = resp.data.source.Authorizations;
          expect(authorizations.edges.length).to.be(1);
          expect(authorizations.totalCount).to.be(2);
          expect(authorizations.pageInfo.endCursor!.value).to.equal('(invalid user)');
        });
    });

    it('Make sure that pagination is working in Authorizations query', () => {
      return client
        .query<GetAuthorizationsQuery.Query>({
          query: authorizationsQuery,
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
          const authorizations = resp.data.source.Authorizations;

          expect(authorizations.edges.length).to.be(1);
          expect(authorizations.totalCount).to.be(2);
          expect(authorizations.edges[0]!.authorization.host.name).to.be('siem-kibana');
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default authorizationsTests;
