/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import {
  GetHostsTableQuery,
  GetHostSummaryQuery,
} from '../../../../plugins/secops/public/graphql/types';
import { HostSummaryQuery } from './../../../../plugins/secops/public/containers/hosts/host_summary.gql_query';
import { HostsTableQuery } from './../../../../plugins/secops/public/containers/hosts/hosts_table.gql_query';
import { KbnTestProvider } from './types';

const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

// typical values that have to change after an update from "scripts/es_archiver"
const HOST_NAME = 'Ubuntu';
const TOTAL_COUNT = 6;
const EDGE_LENGTH = 1;
const CURSOR_ID = '2ab45fc1c41e4c84bbd02202a7e5761f';

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
          const hosts = resp.data.source.Hosts;
          expect(hosts.edges.length).to.be(EDGE_LENGTH);
          expect(hosts.totalCount).to.be(TOTAL_COUNT);
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
          const hosts = resp.data.source.Hosts;

          expect(hosts.edges.length).to.be(EDGE_LENGTH);
          expect(hosts.totalCount).to.be(TOTAL_COUNT);
          expect(hosts.edges[0]!.node.host!.os!.name).to.be(HOST_NAME);
        });
    });

    it('Make sure that we get Host Summary data', () => {
      const expectedHost: GetHostSummaryQuery.Host = {
        architecture: 'x86_64',
        id: CURSOR_ID,
        ip: null,
        mac: null,
        name: 'zeek-sensor-san-francisco',
        os: {
          family: 'debian',
          name: HOST_NAME,
          platform: 'ubuntu',
          version: '18.04.2 LTS (Bionic Beaver)',
          __typename: 'OsEcsFields',
        },
        type: null,
        __typename: 'HostEcsFields',
      };

      return client
        .query<GetHostSummaryQuery.Query>({
          query: HostSummaryQuery,
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
            filterQuery: JSON.stringify({
              term: {
                'host.id': CURSOR_ID,
              },
            }),
          },
        })
        .then(resp => {
          const hosts = resp.data.source.Hosts;
          expect(hosts.edges.length).to.be(EDGE_LENGTH);
          expect(hosts.totalCount).to.be(EDGE_LENGTH);
          expect(hosts.edges[0]!.node!.host!).to.eql(expectedHost);
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default hostsTests;
