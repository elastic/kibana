/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import {
  Direction,
  GetHostOverviewQuery,
  GetHostFirstLastSeenQuery,
  GetHostsTableQuery,
  HostsFields,
} from '../../../../plugins/security_solution/public/graphql/types';
import { HostOverviewQuery } from '../../../../plugins/security_solution/public/hosts/containers/hosts/overview/host_overview.gql_query';
import { HostFirstLastSeenGqlQuery } from '../../../../plugins/security_solution/public/hosts/containers/hosts/first_last_seen/first_last_seen.gql_query';
import { HostsTableQuery } from '../../../../plugins/security_solution/public/hosts/containers/hosts/hosts_table.gql_query';
import { FtrProviderContext } from '../../ftr_provider_context';

const FROM = '2000-01-01T00:00:00.000Z';
const TO = '3000-01-01T00:00:00.000Z';

// typical values that have to change after an update from "scripts/es_archiver"
const HOST_NAME = 'Ubuntu';
const TOTAL_COUNT = 7;
const EDGE_LENGTH = 1;
const CURSOR_ID = '2ab45fc1c41e4c84bbd02202a7e5761f';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');

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
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            docValueFields: [],
            sort: {
              field: HostsFields.lastSeen,
              direction: Direction.asc,
            },
            pagination: {
              activePage: 0,
              cursorStart: 0,
              fakePossibleCount: 3,
              querySize: 1,
            },
            inspect: false,
          },
        })
        .then((resp) => {
          const hosts = resp.data.source.Hosts;
          expect(hosts.edges.length).to.be(EDGE_LENGTH);
          expect(hosts.totalCount).to.be(TOTAL_COUNT);
          expect(hosts.pageInfo.fakeTotalCount).to.equal(3);
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
            sort: {
              field: HostsFields.lastSeen,
              direction: Direction.asc,
            },
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            docValueFields: [],
            pagination: {
              activePage: 2,
              cursorStart: 1,
              fakePossibleCount: 5,
              querySize: 2,
            },
            inspect: false,
          },
        })
        .then((resp) => {
          const hosts = resp.data.source.Hosts;

          expect(hosts.edges.length).to.be(EDGE_LENGTH);
          expect(hosts.totalCount).to.be(TOTAL_COUNT);
          expect(hosts.edges[0]!.node.host!.os!.name).to.eql([HOST_NAME]);
        });
    });

    it('Make sure that we get Host Overview data', () => {
      const expectedHost: Omit<GetHostOverviewQuery.HostOverview, 'inspect'> = {
        _id: 'zeek-sensor-san-francisco',
        endpoint: null,
        host: {
          architecture: ['x86_64'],
          id: [CURSOR_ID],
          ip: [],
          mac: [],
          name: ['zeek-sensor-san-francisco'],
          os: {
            family: ['debian'],
            name: [HOST_NAME],
            platform: ['ubuntu'],
            version: ['18.04.2 LTS (Bionic Beaver)'],
            __typename: 'OsEcsFields',
          },
          type: null,
          __typename: 'HostEcsFields',
        },
        cloud: {
          instance: {
            id: ['132972452'],
            __typename: 'CloudInstance',
          },
          machine: {
            type: [],
            __typename: 'CloudMachine',
          },
          provider: ['digitalocean'],
          region: ['sfo2'],
          __typename: 'CloudFields',
        },
        __typename: 'HostItem',
      };

      return client
        .query<GetHostOverviewQuery.Query>({
          query: HostOverviewQuery,
          variables: {
            sourceId: 'default',
            hostName: 'zeek-sensor-san-francisco',
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            docValueFields: [],
            inspect: false,
          },
        })
        .then((resp) => {
          const hosts = resp.data.source.HostOverview;
          expect(hosts).to.eql(expectedHost);
        });
    });

    it('Make sure that we get Last First Seen for a Host', () => {
      return client
        .query<GetHostFirstLastSeenQuery.Query>({
          query: HostFirstLastSeenGqlQuery,
          variables: {
            sourceId: 'default',
            hostName: 'zeek-sensor-san-francisco',
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
            docValueFields: [],
          },
        })
        .then((resp) => {
          const firstLastSeenHost = resp.data.source.HostFirstLastSeen;
          expect(firstLastSeenHost).to.eql({
            __typename: 'FirstLastSeenHost',
            firstSeen: '2019-02-19T19:36:23.561Z',
            lastSeen: '2019-02-19T20:42:33.561Z',
          });
        });
    });
  });
}
