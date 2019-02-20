/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import {
  GetHostsTableQuery,
  GetHostSummaryQuery,
} from '../../../../plugins/secops/public/graphql/types';
import { HostSummaryQuery } from './../../../../plugins/secops/public/containers/hosts/host_summary.gql_query';
import { HostsTableQuery } from './../../../../plugins/secops/public/containers/hosts/hosts_table.gql_query';
import { KbnTestProvider } from './types';

const hostsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

  describe('hosts', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get Hosts Table data', () => {
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
          expect(hosts.pageInfo.endCursor!.value).to.equal('1');
        });
    });

    it('Make sure that pagination is working in Hosts Table query', () => {
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
              cursor: '1',
            },
          },
        })
        .then(resp => {
          const hosts = resp.data.source.Hosts;

          expect(hosts.edges.length).to.be(1);
          expect(hosts.totalCount).to.be(2);
          expect(hosts.edges[0]!.node.host!.os!.name).to.be('Debian GNU/Linux');
        });
    });

    it('Make sure that we get Host Summary data', () => {
      const expectedHost: GetHostSummaryQuery.Host = {
        architecture: 'x86_64',
        id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
        ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
        mac: ['42:01:0a:8e:00:07'],
        name: 'siem-kibana',
        os: {
          family: 'debian',
          name: 'Debian GNU/Linux',
          platform: 'debian',
          version: '9 (stretch)',
          __typename: 'OsEcsFields',
        },
        type: 'projects/189716325846/machineTypes/n1-standard-1',
        __typename: 'HostEcsFields',
      };

      return client
        .query<GetHostSummaryQuery.Query>({
          query: HostSummaryQuery,
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
            filterQuery: JSON.stringify({
              term: {
                'host.id': 'aa7ca589f1b8220002f2fc61c64cfbf1',
              },
            }),
          },
        })
        .then(resp => {
          const hosts = resp.data.source.Hosts;
          expect(hosts.edges.length).to.be(1);
          expect(hosts.totalCount).to.be(1);
          expect(hosts.edges[0]!.node!.host!).to.eql(expectedHost);
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default hostsTests;
