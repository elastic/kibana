/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { uncommonProcessesQuery } from '../../../../plugins/security_solution/public/hosts/containers/uncommon_processes/index.gql_query';
import { GetUncommonProcessesQuery } from '../../../../plugins/security_solution/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

// typical values that have to change after an update from "scripts/es_archiver"
const TOTAL_COUNT = 3;

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');

  describe('uncommon_processes', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('should return an edge of length 1 when given a pagination of length 1', async () => {
      const {
        data: {
          source: { UncommonProcesses },
        },
      } = await client.query<GetUncommonProcessesQuery.Query>({
        query: uncommonProcessesQuery,
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
          inspect: false,
        },
      });
      expect(UncommonProcesses.edges.length).to.be(1);
    });

    it('should return an edge of length 2 when given a pagination of length 2', async () => {
      const {
        data: {
          source: { UncommonProcesses },
        },
      } = await client.query<GetUncommonProcessesQuery.Query>({
        query: uncommonProcessesQuery,
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
            querySize: 2,
          },
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          inspect: false,
        },
      });
      expect(UncommonProcesses.edges.length).to.be(2);
    });

    it('should return a total count of elements', async () => {
      const {
        data: {
          source: { UncommonProcesses },
        },
      } = await client.query<GetUncommonProcessesQuery.Query>({
        query: uncommonProcessesQuery,
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
          inspect: false,
        },
      });
      expect(UncommonProcesses.totalCount).to.be(TOTAL_COUNT);
    });

    it('should return a single data set with pagination of 1', async () => {
      const {
        data: {
          source: { UncommonProcesses },
        },
      } = await client.query<GetUncommonProcessesQuery.Query>({
        query: uncommonProcessesQuery,
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
          inspect: false,
        },
      });
      const expected: GetUncommonProcessesQuery.Node = {
        _id: 'HCFxB2kBR346wHgnL4ik',
        instances: 1,
        process: {
          args: [],
          name: ['kworker/u2:0'],
          __typename: 'ProcessEcsFields',
        },
        user: {
          id: ['0'],
          name: ['root'],
          __typename: 'UserEcsFields',
        },
        hosts: [
          {
            name: ['zeek-sensor-san-francisco'],
            __typename: 'HostEcsFields',
          },
        ],
        __typename: 'UncommonProcessItem',
      };
      expect(UncommonProcesses.edges[0].node).to.eql(expected);
    });
  });
}
