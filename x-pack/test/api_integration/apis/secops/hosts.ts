/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { GetHostsTableQuery } from '../../../../plugins/secops/public/graphql/types';
import { HostsTableQuery } from './../../../../plugins/secops/public/containers/hosts/index.gql_query';
import { KbnTestProvider } from './types';

const hostsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

  describe('hosts', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get Hosts data', () => {
      return client
        .query<GetHostsTableQuery.Query>({
          query: HostsTableQuery,
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
          const hosts = resp.data.source.Hosts;
          expect(hosts.edges.length).to.be(1);
          expect(hosts.totalCount).to.be(2);
          expect(hosts.pageInfo.endCursor!.value).to.equal('aa7ca589f1b8220002f2fc61c64cfbf1');
        });
    });

    it('Make sure that pagination is working in Hosts query', () => {
      return client
        .query<GetHostsTableQuery.Query>({
          query: HostsTableQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: 1546554465535,
              from: 1483306065535,
            },
            pagination: {
              limit: 2,
              cursor: 'aa7ca589f1b8220002f2fc61c64cfbf1',
            },
          },
        })
        .then(resp => {
          const hosts = resp.data.source.Hosts;

          expect(hosts.edges.length).to.be(1);
          expect(hosts.totalCount).to.be(2);
          expect(hosts.edges[0]!.node.host!.os!.name).to.be('siem-general');
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default hostsTests;
