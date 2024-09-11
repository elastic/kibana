/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  AGENTS_INDEX,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import {
  FILE_STORAGE_DATA_AGENT_INDEX,
  FILE_STORAGE_METADATA_AGENT_INDEX,
} from '@kbn/fleet-plugin/server/constants';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { generateAgent } from '../../helpers';
import { runPrivilegeTests } from '../../privileges_helpers';
import { testUsers } from '../test_users';

const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  let elasticAgentpkgVersion: string;

  describe('fleet_agents_api_privileges', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
      const getPkRes = await supertest
        .get(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      elasticAgentpkgVersion = getPkRes.body.item.version;
      // Install latest version of the package
      await supertest
        .post(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}/${elasticAgentpkgVersion}`)
        .send({
          force: true,
        })
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      await supertest.post(`/api/fleet/agent_policies`).set('kbn-xsrf', 'kibana').send({
        name: 'Fleet Server policy 1',
        id: 'fleet-server-policy',
        namespace: 'default',
        has_fleet_server: true,
      });

      await kibanaServer.savedObjects.create({
        id: `package-policy-test`,
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        overwrite: true,
        attributes: {
          policy_id: 'fleet-server-policy',
          name: 'Fleet Server',
          package: {
            name: 'fleet_server',
          },
        },
      });
      await generateAgent(
        providerContext,
        'healthy',
        'agentWithFS',
        'fleet-server-policy',
        fleetServerVersion
      );

      // Make agent 1 upgradeable
      await es.update({
        id: 'agent1',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        doc: {
          local_metadata: {
            elastic: { agent: { upgradeable: true, version: '8.13.0' } },
          },
        },
      });
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
      await supertest
        .delete(`/api/fleet/epm/packages/${FLEET_ELASTIC_AGENT_PACKAGE}/${elasticAgentpkgVersion}`)
        .set('kbn-xsrf', 'xxxx');
      await es.transport
        .request({
          method: 'DELETE',
          path: `/_data_stream/metrics-elastic_agent.elastic_agent-default`,
        })
        .catch(() => {});
    });

    const fleetServerVersion = '8.14.0';

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
        user: testUsers.fleet_agents_read_only,
        statusCode: 200,
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
      {
        user: testUsers.fleet_settings_read_only,
        statusCode: 403,
      },
    ];

    const ALL_SCENARIOS = [
      {
        user: testUsers.fleet_all_only,
        statusCode: 200,
      },
      {
        user: testUsers.fleet_agents_all_only,
        statusCode: 200,
      },
      {
        user: testUsers.fleet_agents_read_only,
        statusCode: 403,
      },
      {
        user: testUsers.fleet_read_only,
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
      {
        user: testUsers.fleet_settings_read_only,
        statusCode: 403,
      },
    ];

    let agentDoc: any;
    const updateAgentBeforeEach = async () => {
      const res = await es.get({
        id: 'agent1',
        index: AGENTS_INDEX,
      });

      agentDoc = res._source;
    };
    const updateAgentAfterEach = async () => {
      await es.update({
        id: 'agent1',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        doc_as_upsert: true,
        doc: {
          upgrade_details: null,
          upgrade_started_at: null,
          upgraded_at: null,
          unenrollment_started_at: null,
          ...agentDoc,
        },
      });
    };

    const createFileBeforeEach = async () => {
      await es.index(
        {
          id: 'file1.0',
          refresh: 'wait_for',
          op_type: 'create',
          index: FILE_STORAGE_DATA_AGENT_INDEX,
          document: {
            bid: 'file1',
            '@timestamp': new Date().toISOString(),
            last: true,
            data: 'test',
          },
        },
        ES_INDEX_OPTIONS
      );

      await es.index(
        {
          index: FILE_STORAGE_METADATA_AGENT_INDEX,
          id: 'file1',
          refresh: true,
          op_type: 'create',
          body: {
            '@timestamp': new Date().toISOString(),
            upload_id: 'file1',
            action_id: `fleet_uploads_test-file1-action`,
            agent_id: 'agent1',
            file: {
              ChunkSize: 4194304,
              extension: 'zip',
              hash: {},
              mime_type: 'application/zip',
              mode: '0644',
              name: `elastic-agent-diagnostics-file-name.zip`,
              path: `/agent/elastic-agent-diagnostics-file-name.zip`,
              size: 24917,
              Status: 'READY',
              type: 'file',
            },
          },
        },
        ES_INDEX_OPTIONS
      );
    };

    const deleteFileAfterEach = async () => {
      await es.deleteByQuery(
        {
          index: `${FILE_STORAGE_DATA_AGENT_INDEX},${FILE_STORAGE_METADATA_AGENT_INDEX}`,
          refresh: true,
          ignore_unavailable: true,
          query: {
            match_all: {},
          },
        },
        ES_INDEX_OPTIONS
      );
    };

    const ROUTES = [
      // READ scenarios
      {
        method: 'GET',
        path: '/api/fleet/agents',
        scenarios: READ_SCENARIOS,
      },
      {
        method: 'GET',
        path: '/api/fleet/agent-status',
        scenarios: READ_SCENARIOS,
      },
      {
        method: 'GET',
        path: '/api/fleet/agents/action_status',
        scenarios: READ_SCENARIOS,
      },
      {
        method: 'GET',
        path: '/api/fleet/agents/agent1',
        scenarios: READ_SCENARIOS,
      },
      {
        method: 'POST',
        path: '/api/fleet/agents/agent1/request_diagnostics',
        scenarios: READ_SCENARIOS,
      },
      {
        method: 'GET',
        path: '/api/fleet/agents/files/file1/elastic-agent-diagnostics-file-name.zip',
        scenarios: READ_SCENARIOS,
        beforeEach: createFileBeforeEach,
        afterEach: deleteFileAfterEach,
      },

      // ALL scenarios
      {
        method: 'PUT',
        path: '/api/fleet/agents/agent1',
        scenarios: ALL_SCENARIOS,
        send: {
          tags: ['tag1'],
        },
      },
      {
        method: 'POST',
        path: '/api/fleet/agents/agent1/unenroll',
        scenarios: ALL_SCENARIOS,
        beforeEach: updateAgentBeforeEach,
        afterEach: updateAgentAfterEach,
      },
      {
        method: 'POST',
        path: '/api/fleet/agents/agent1/upgrade',
        scenarios: ALL_SCENARIOS,
        send: {
          version: fleetServerVersion,
        },
        beforeEach: updateAgentBeforeEach,
        afterEach: updateAgentAfterEach,
      },
      {
        method: 'DELETE',
        path: '/api/fleet/agents/agent1',
        scenarios: ALL_SCENARIOS,
        beforeEach: updateAgentBeforeEach,
        afterEach: updateAgentAfterEach,
      },
      {
        method: 'DELETE',
        path: '/api/fleet/agents/files/file1',
        scenarios: ALL_SCENARIOS,
        beforeEach: createFileBeforeEach,
        afterEach: deleteFileAfterEach,
      },
    ];
    runPrivilegeTests(ROUTES, supertestWithoutAuth);
  });
}
