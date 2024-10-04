/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { runPrivilegeTests } from '../privileges_helpers';
import { setupTestUsers, testUsers } from './test_users';

const READ_SCENARIOS = [
  {
    user: testUsers.fleet_all_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_read_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_settings_all_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_settings_read_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_agent_policies_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agent_policies_all_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agents_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_no_access,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_minimal_all_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_minimal_read_only,
    statusCode: 403,
  },
];

const ALL_SCENARIOS = [
  {
    user: testUsers.fleet_all_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_settings_all_only,
    statusCode: 200,
  },
  {
    user: testUsers.fleet_settings_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agent_policies_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agent_policies_all_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_agents_read_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_no_access,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_minimal_all_only,
    statusCode: 403,
  },
  {
    user: testUsers.fleet_minimal_read_only,
    statusCode: 403,
  },
];

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const ROUTES = [
    {
      method: 'GET',
      path: '/api/fleet/outputs',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'GET',
      path: '/api/fleet/outputs/test-privileges-output-1',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'POST',
      path: '/api/fleet/outputs',
      scenarios: ALL_SCENARIOS,
      send: {
        id: 'test-privileges-output-2',
        name: 'Test privileges es output 2' + new Date().toISOString(),
        type: 'elasticsearch',
        hosts: ['https://test.fr'],
      },
      afterEach: async () => {
        await supertest
          .delete(`/api/fleet/outputs/test-privileges-output-2`)
          .set('kbn-xsrf', 'xxxx');
      },
    },
    {
      method: 'DELETE',
      path: '/api/fleet/outputs/test-privileges-output-2',
      scenarios: ALL_SCENARIOS,
      beforeEach: async () => {
        await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: 'test-privileges-output-2',
            name: 'Test privileges es output 2' + new Date().toISOString(),
            type: 'elasticsearch',
            hosts: ['https://test.fr'],
          })
          .expect(200);
      },
      afterEach: async () => {
        await supertest
          .delete(`/api/fleet/outputs/test-privileges-output-2`)
          .set('kbn-xsrf', 'xxxx');
      },
    },
    {
      method: 'GET',
      path: '/api/fleet/fleet_server_hosts',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'GET',
      path: '/api/fleet/fleet_server_hosts/test-privileges-fleet-server-hosts-1',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'POST',
      path: '/api/fleet/fleet_server_hosts',
      scenarios: ALL_SCENARIOS,
      send: {
        id: 'test-privileges-fleet-server-hosts-2',
        name: 'Test privileges fleet server host 2' + new Date().toISOString(),
        is_default: false,
        host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
      },
      afterEach: async () => {
        await supertest
          .delete(`/api/fleet/fleet_server_hosts/test-privileges-fleet-server-hosts-2`)
          .set('kbn-xsrf', 'xxxx');
      },
    },
    {
      method: 'DELETE',
      path: '/api/fleet/fleet_server_hosts/test-privileges-fleet-server-hosts-2',
      scenarios: ALL_SCENARIOS,
      beforeEach: async () => {
        await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: 'test-privileges-fleet-server-hosts-2',
            name: 'Test privileges fleet server host 2' + new Date().toISOString(),
            is_default: false,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
          });
      },
      afterEach: async () => {
        await supertest
          .delete(`/api/fleet/fleet_server_hosts/test-privileges-fleet-server-hosts-2`)
          .set('kbn-xsrf', 'xxxx');
      },
    },
    {
      method: 'GET',
      path: '/api/fleet/proxies',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'GET',
      path: '/api/fleet/proxies/test-privileges-fleet-proxy-1',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'POST',
      path: '/api/fleet/proxies',
      scenarios: ALL_SCENARIOS,
      send: {
        id: 'test-privileges-fleet-proxy-2',
        name: 'Test privileges proxy 2 ' + new Date().toISOString(),
        url: 'https://test.fr:3232',
      },
      afterEach: async () => {
        await supertest
          .delete(`/api/fleet/proxies/test-privileges-fleet-proxy-2`)
          .set('kbn-xsrf', 'xxxx');
      },
    },
    {
      method: 'GET',
      path: '/api/fleet/agent_download_sources',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'GET',
      path: '/api/fleet/agent_download_sources/test-privileges-download-source-1',
      scenarios: READ_SCENARIOS,
    },
    {
      method: 'POST',
      path: '/api/fleet/agent_download_sources',
      scenarios: ALL_SCENARIOS,
      send: {
        id: 'test-privileges-download-source-2',
        name: 'Test download source 2 ' + new Date().toISOString(),
        host: 'http://test.fr:443',
        is_default: false,
      },
      afterEach: async () => {
        await supertest
          .delete(`/api/fleet/agent_download_sources/test-privileges-download-source-2`)
          .set('kbn-xsrf', 'xxxx');
      },
    },
  ];

  describe('fleet_settings_privileges (Outputs, FleetServerHosts, Proxies, ...)', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await setupTestUsers(getService('security'));

      await supertest
        .post(`/api/fleet/outputs`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'test-privileges-output-1',
          name: 'Test privileges es output ' + new Date().toISOString(),
          type: 'elasticsearch',
          hosts: ['https://test.fr'],
        })
        .expect(200);

      await supertest
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'test-privileges-fleet-server-hosts-1',
          name: 'Test privileges fleet server host ' + new Date().toISOString(),
          is_default: false,
          host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
        })
        .expect(200);

      await supertest
        .post(`/api/fleet/proxies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'test-privileges-fleet-proxy-1',
          name: 'Test privileges proxy 1 ' + new Date().toISOString(),
          url: 'https://test.fr:3232',
        })
        .expect(200);

      await supertest
        .post(`/api/fleet/agent_download_sources`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'test-privileges-download-source-1',
          name: 'Test download source 1 ' + new Date().toISOString(),
          host: 'http://test.fr:443',
          is_default: false,
        })
        .expect(200);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    runPrivilegeTests(ROUTES, supertestWithoutAuth);
  });
}
