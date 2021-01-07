/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import {
  HostsQueries,
  Direction,
  HostsFields,
} from '../../../../plugins/security_solution/common/search_strategy';

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
  const supertest = getService('supertest');

  describe('hosts', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get Hosts Table data', async () => {
      const { body: hosts } = await supertest
        .post('/internal/search/securitySolutionSearchStrategy/')
        .set('kbn-xsrf', 'true')
        .send({
          factoryQueryType: HostsQueries.hosts,
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
        })
        .expect(200);
      expect(hosts.edges.length).to.be(EDGE_LENGTH);
      expect(hosts.totalCount).to.be(TOTAL_COUNT);
      expect(hosts.pageInfo.fakeTotalCount).to.equal(3);
    });

    it('Make sure that pagination is working in Hosts Table query', async () => {
      const { body: hosts } = await supertest
        .post('/internal/search/securitySolutionSearchStrategy/')
        .set('kbn-xsrf', 'true')
        .send({
          factoryQueryType: HostsQueries.hosts,
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
        })
        .expect(200);
      expect(hosts.edges.length).to.be(EDGE_LENGTH);
      expect(hosts.totalCount).to.be(TOTAL_COUNT);
      expect(hosts.edges[0]!.node.host!.os!.name).to.eql([HOST_NAME]);
    });

    it('Make sure that we get Host details data', async () => {
      const expectedHostDetails = {
        _id: 'zeek-sensor-san-francisco',
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
          },
        },
        cloud: {
          instance: {
            id: ['132972452'],
          },
          machine: {
            type: [],
          },
          provider: ['digitalocean'],
          region: ['sfo2'],
        },
      };
      const {
        body: { hostDetails },
      } = await supertest
        .post('/internal/search/securitySolutionSearchStrategy/')
        .set('kbn-xsrf', 'true')
        .send({
          factoryQueryType: HostsQueries.details,
          hostName: 'zeek-sensor-san-francisco',
          timerange: {
            interval: '12h',
            to: TO,
            from: FROM,
          },
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          docValueFields: [],
          inspect: false,
        })
        .expect(200);

      expect(hostDetails).to.eql(expectedHostDetails);
    });

    it('Make sure that we get Last First Seen for a Host', async () => {
      const { body: firstLastSeenHost } = await supertest
        .post('/internal/search/securitySolutionSearchStrategy/')
        .set('kbn-xsrf', 'true')
        .send({
          factoryQueryType: HostsQueries.firstLastSeen,
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          docValueFields: [],
          hostName: 'zeek-sensor-san-francisco',
        })
        .expect(200);
      const expected = {
        firstSeen: '2019-02-19T19:36:23.561Z',
        lastSeen: '2019-02-19T20:42:33.561Z',
      };

      expect(firstLastSeenHost.firstSeen).to.eql(expected.firstSeen);
      expect(firstLastSeenHost.lastSeen).to.eql(expected.lastSeen);
    });
  });
}
