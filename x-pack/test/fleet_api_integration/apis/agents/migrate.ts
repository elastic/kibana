/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');

  describe('fleet_agents_migrate', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');

      // Create agent policies using the Fleet API
      // Policy 1 - regular policy without tamper protection
      const policy1Response = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'Policy 1',
          namespace: 'default',
          description: 'Test policy 1',
          monitoring_enabled: ['logs', 'metrics'],
        })
        .expect(200);

      const policy1 = policy1Response.body.item;

      // Policy 2 - with tamper protection
      const policy2Response = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'Policy 2',
          namespace: 'default',
          description: 'Test policy 2 with tamper protection',
          monitoring_enabled: ['logs', 'metrics'],
        })
        .expect(200);

      const policy2 = policy2Response.body.item;

      // First, install the endpoint package which is required for the endpoint package policy
      await supertest
        .post('/api/fleet/epm/packages/endpoint')
        .set('kbn-xsrf', 'xx')
        .send({ force: true })
        .expect(200);

      // Fetch the installed package to get its current version
      const packageInfoResponse = await supertest
        .get('/api/fleet/epm/packages/endpoint')
        .set('kbn-xsrf', 'xx')
        .expect(200);

      const endpointPackageVersion = packageInfoResponse.body.item.version;

      // Create Elastic Defend package policy for policy2 with proper configuration
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'endpoint-1',
          description: 'Endpoint Security Integration',
          namespace: 'default',
          policy_id: policy2.id,
          enabled: true,
          inputs: [
            {
              type: 'endpoint',
              enabled: true,
              streams: [],
              config: {
                policy: {
                  value: {
                    windows: {
                      events: {
                        dll_and_driver_load: true,
                        dns: true,
                        file: true,
                        network: true,
                        process: true,
                        registry: true,
                        security: true,
                      },
                      malware: { mode: 'prevent' },
                      ransomware: { mode: 'prevent' },
                      memory_protection: { mode: 'prevent' },
                      behavior_protection: { mode: 'prevent' },
                      popup: {
                        malware: { enabled: true, message: '' },
                        ransomware: { enabled: true, message: '' },
                      },
                    },
                    mac: {
                      events: { file: true, network: true, process: true },
                      malware: { mode: 'prevent' },
                      behavior_protection: { mode: 'prevent' },
                      popup: { malware: { enabled: true, message: '' } },
                    },
                    linux: {
                      events: { file: true, network: true, process: true },
                      malware: { mode: 'prevent' },
                      behavior_protection: { mode: 'prevent' },
                      popup: { malware: { enabled: true, message: '' } },
                    },
                  },
                },
              },
            },
          ],
          package: {
            name: 'endpoint',
            title: 'Elastic Defend',
            version: endpointPackageVersion, // Use the actual installed version
          },
        })
        .expect(200);

      // Now enable tamper protection on policy2
      await supertest
        .put(`/api/fleet/agent_policies/${policy2.id}`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: policy2.name,
          namespace: 'default',
          description: policy2.description,
          is_protected: true, // Enable tamper protection
        })
        .expect(200);

      // Create agents in Elasticsearch
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent1',
        document: {
          policy_id: policy1.id,
        },
      });

      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent2',
        document: {
          policy_id: policy2.id, // Policy 2 is tamper protected
        },
      });
      await es.index({
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        id: 'agent3',
        document: {
          policy_id: policy1.id,
          components: [
            {
              type: 'fleet-server',
              id: 'fleet-server',
              revision: 1,
            },
          ],
        },
      });
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
      // Cleanup will be handled automatically by Fleet API
    });

    describe('POST /agents/{agentId}/migrate', () => {
      it('should return a 200 if the migration action is successful', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/agent1/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(200);
      });

      it('should return a 403 if the agent is tamper protected', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/agent2/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(403);
      });

      it('should return a 403 if the agent is a fleet-agent', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/agent3/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(403);
      });

      it('should return a 404 when agent does not exist', async () => {
        await supertest
          .post(`/api/fleet/agents/agent100/migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            enrollment_token: '1234',
            uri: 'https://example.com',
          })
          .expect(404);
      });
    });

    // Bulk migrate agents
    describe('POST /agents/bulk_migrate', () => {
      it('should return a 200 if the migration action is successful', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/bulk_migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent1'],
            uri: 'https://example.com',
            enrollment_token: '1234',
          })
          .expect(200);
      });

      it('should return a 403 if any agent is tamper protected', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/bulk_migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent1', 'agent2'],
            uri: 'https://example.com',
            enrollment_token: '1234',
          })
          .expect(403);
      });

      it('should return a 403 if any agent is a fleet-agent', async () => {
        const {} = await supertest
          .post(`/api/fleet/agents/bulk_migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent1', 'agent3'],
            uri: 'https://example.com',
            enrollment_token: '1234',
          })
          .expect(403);
      });

      it('should return a 404 when any agent does not exist', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_migrate`)
          .set('kbn-xsrf', 'xx')
          .send({
            agents: ['agent100', 'agent400', 'agent1'],
            uri: 'https://example.com',
            enrollment_token: '1234',
          })
          .expect(404);
      });
    });
  });
}
