/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { uncommonProcessesQuery } from '../../../../plugins/siem/public/containers/uncommon_processes/index.gql_query';
import { GetUncommonProcessesQuery } from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

// typical values that have to change after an update from "scripts/es_archiver"
const TOTAL_COUNT = 80;

const uncommonProcessesTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');

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
            limit: 1,
          },
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
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
            limit: 2,
          },
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        },
      });
      expect(UncommonProcesses.edges.length).to.be(2);
    });

    it('should return a total count of 6 elements', async () => {
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
            limit: 1,
          },
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
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
            limit: 1,
          },
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
        },
      });
      const expected: GetUncommonProcessesQuery.Node = {
        _id: 'Ax5CB2kBR346wHgnUJ1s',
        instances: 1,
        process: {
          args: [
            '/usr/bin/suricata',
            '-c',
            '/etc/suricata/suricata.yaml',
            '-i',
            'eth0',
            '--init-errors-fatal',
          ],
          name: ['Suricata-Main'],
          __typename: 'ProcessEcsFields',
        },
        user: {
          id: ['0'],
          name: ['root'],
          __typename: 'UserEcsFields',
        },
        hosts: [
          {
            name: ['suricata-zeek-sensor-toronto'],
            __typename: 'HostEcsFields',
          },
        ],
        __typename: 'UncommonProcessItem',
      };
      expect(UncommonProcesses.edges[0].node).to.eql(expected);
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default uncommonProcessesTests;
