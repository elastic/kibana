/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { GetHostsQuery } from '../../../../plugins/secops/common/graphql/types';
import { hostsQuery } from '../../../../plugins/secops/public/containers/hosts/index.gql_query';

import { KbnTestProvider } from './types';

const hostsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

  describe('sources', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get Hosts data', () => {
      return client
        .query<GetHostsQuery.Query>({
          query: hostsQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: 1514782800000,
              from: 1546318799999,
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
          expect(hosts.pageInfo.endCursor!.value).to.equal('6f7be6fb33e6c77f057266415c094408');
        });
    });

    it('Make sure that we the pagination is working in Hosts query', () => {
      return client
        .query<GetHostsQuery.Query>({
          query: hostsQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: 1514782800000,
              from: 1546318799999,
            },
            pagination: {
              limit: 2,
              cursor: '6f7be6fb33e6c77f057266415c094408',
            },
          },
        })
        .then(resp => {
          const hosts = resp.data.source.Hosts;

          expect(hosts.edges.length).to.be(1);
          expect(hosts.totalCount).to.be(2);
          expect(hosts.edges[0]!.host.name).to.be('elrond.elstc.co');
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default hostsTests;
