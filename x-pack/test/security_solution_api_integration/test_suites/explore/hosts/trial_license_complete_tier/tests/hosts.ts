/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  HostsQueries,
  Direction,
  HostsFields,
  HostsStrategyResponse,
  HostDetailsStrategyResponse,
  FirstLastSeenQuery,
  FirstLastSeenStrategyResponse,
} from '@kbn/security-solution-plugin/common/search_strategy';
import TestAgent from 'supertest/lib/agent';
import { BsearchService } from '@kbn/ftr-common-functional-services';

import { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';

const FROM = '2000-01-01T00:00:00.000Z';
const TO = '3000-01-01T00:00:00.000Z';

// typical values that have to change after an update from "scripts/es_archiver"
const HOST_NAME = 'Ubuntu';
const TOTAL_COUNT = 7;
const EDGE_LENGTH = 1;
const CURSOR_ID = '2ab45fc1c41e4c84bbd02202a7e5761f';

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const esArchiver = getService('esArchiver');
  const utils = getService('securitySolutionUtils');

  describe('hosts', () => {
    let supertest: TestAgent;
    let bsearch: BsearchService;
    before(async () => {
      supertest = await utils.createSuperTest();
      bsearch = await utils.createBsearch();
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
    });

    after(
      async () => await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts')
    );

    it('Make sure that we get Hosts Table data', async () => {
      const hosts = await bsearch.send<HostsStrategyResponse>({
        supertest,
        options: {
          factoryQueryType: HostsQueries.hosts,
          timerange: {
            interval: '12h',
            to: TO,
            from: FROM,
          },
          defaultIndex: ['auditbeat-*'],
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
        strategy: 'securitySolutionSearchStrategy',
      });
      expect(hosts.edges.length).to.be(EDGE_LENGTH);
      expect(hosts.totalCount).to.be(TOTAL_COUNT);
      expect(hosts.pageInfo.fakeTotalCount).to.equal(3);
    });

    it('Make sure that pagination is working in Hosts Table query', async () => {
      const hosts = await bsearch.send<HostsStrategyResponse>({
        supertest,
        options: {
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
          defaultIndex: ['auditbeat-*'],
          pagination: {
            activePage: 2,
            cursorStart: 1,
            fakePossibleCount: 5,
            querySize: 2,
          },
          inspect: false,
        },
        strategy: 'securitySolutionSearchStrategy',
      });
      expect(hosts.edges.length).to.be(EDGE_LENGTH);
      expect(hosts.totalCount).to.be(TOTAL_COUNT);
      expect(hosts.edges[0].node.host?.os?.name).to.eql([HOST_NAME]);
    });

    it('Make sure that we get Host details data', async () => {
      const { hostDetails } = await bsearch.send<HostDetailsStrategyResponse>({
        supertest,
        options: {
          factoryQueryType: HostsQueries.details,
          hostName: 'zeek-sensor-san-francisco',
          timerange: {
            interval: '12h',
            to: TO,
            from: FROM,
          },
          defaultIndex: ['auditbeat-*'],
          inspect: false,
        },
        strategy: 'securitySolutionSearchStrategy',
      });
      expect(hostDetails).to.eql({
        _id: 'zeek-sensor-san-francisco',
        host: {
          architecture: ['x86_64'],
          id: [CURSOR_ID],
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
          provider: ['digitalocean'],
          region: ['sfo2'],
        },
      });
    });

    it('Make sure that we get First Seen for a Host', async () => {
      const firstLastSeenHost = await bsearch.send<FirstLastSeenStrategyResponse>({
        supertest,
        options: {
          factoryQueryType: FirstLastSeenQuery,
          defaultIndex: ['auditbeat-*'],
          field: 'host.name',
          value: 'zeek-sensor-san-francisco',
          order: 'asc',
        },
        strategy: 'securitySolutionSearchStrategy',
      });
      expect(firstLastSeenHost.firstSeen).to.eql('2019-02-19T19:36:23.561Z');
    });

    it('Make sure that we get Last Seen for a Host', async () => {
      const firstLastSeenHost = await bsearch.send<FirstLastSeenStrategyResponse>({
        supertest,
        options: {
          factoryQueryType: FirstLastSeenQuery,
          defaultIndex: ['auditbeat-*'],
          field: 'host.name',
          value: 'zeek-sensor-san-francisco',
          order: 'desc',
        },
        strategy: 'securitySolutionSearchStrategy',
      });
      expect(firstLastSeenHost.lastSeen).to.eql('2019-02-19T20:42:33.561Z');
    });
  });
}
