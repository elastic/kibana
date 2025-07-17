/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as http from 'http';
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupMockServer } from '../agents/helpers/mock_agentless_api';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const fleetAndAgents = getService('fleetAndAgents');
  const mockAgentlessApiService = setupMockServer();

  describe('package policy deployment modes', () => {
    let mockApiServer: http.Server;
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      mockApiServer = await mockAgentlessApiService.listen(8089); // Start the agentless api mock server on port 8089
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();

      // Set up default Fleet Server host, needed during agentless agent creation
      await supertest
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'fleet-default-fleet-server-host',
          name: 'Default',
          is_default: true,
          host_urls: ['https://test.com:8080', 'https://test.com:8081'],
        });
    });

    after(async () => {
      await supertest
        .delete(`/api/fleet/fleet_server_hosts/fleet-default-fleet-server-host`)
        .set('kbn-xsrf', 'xxxx');
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      mockApiServer.close();
    });

    describe('deployment_modes support', () => {
      let agentPolicyId: string;
      let agentlessAgentPolicyId: string;

      before(async () => {
        // Install test package with deployment_modes
        await supertest
          .post(`/api/fleet/epm/packages/deployment_modes_test/1.0.0`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        // Create regular agent policy
        const {
          body: {
            item: { id: regularPolicyId },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Test policy ${uuidv4()}`,
            namespace: 'default',
            monitoring_enabled: [],
          })
          .expect(200);
        agentPolicyId = regularPolicyId;

        // Create agentless agent policy
        const {
          body: {
            item: { id: agentlessPolicyId },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Test agentless policy ${uuidv4()}`,
            namespace: 'default',
            monitoring_enabled: [],
            supports_agentless: true,
          })
          .expect(200);
        agentlessAgentPolicyId = agentlessPolicyId;
      });

      after(async () => {
        // Clean up agent policies
        if (agentPolicyId) {
          await supertest
            .post(`/api/fleet/agent_policies/delete`)
            .send({ agentPolicyId })
            .set('kbn-xsrf', 'xxxx')
            .expect(200);
        }
        if (agentlessAgentPolicyId) {
          await supertest
            .post(`/api/fleet/agent_policies/delete`)
            .send({ agentPolicyId: agentlessAgentPolicyId })
            .set('kbn-xsrf', 'xxxx')
            .expect(200);
        }

        // Uninstall test package
        await supertest
          .delete(`/api/fleet/epm/packages/deployment_modes_test/1.0.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });

      describe('mixed_modes policy template', () => {
        it('should allow logs input for both default and agentless deployment modes', async () => {
          // Test default deployment mode
          const { body: defaultResponse } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-logs-default-${uuidv4()}`,
              description: 'Test logs input in default mode',
              namespace: 'default',
              policy_id: agentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'logs',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(200);

          expect(defaultResponse.item.inputs).to.have.length(1);
          expect(defaultResponse.item.inputs[0].type).to.be('logs');
          expect(defaultResponse.item.inputs[0].enabled).to.be(true);

          // Test agentless deployment mode
          const { body: agentlessResponse } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-logs-agentless-${uuidv4()}`,
              description: 'Test logs input in agentless mode',
              namespace: 'default',
              policy_id: agentlessAgentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'logs',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(200);

          expect(agentlessResponse.item.inputs).to.have.length(1);
          expect(agentlessResponse.item.inputs[0].type).to.be('logs');
          expect(agentlessResponse.item.inputs[0].enabled).to.be(true);
        });

        it('should allow metrics input only for default deployment mode', async () => {
          // Test default deployment mode (should succeed)
          const { body: defaultResponse } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-metrics-default-${uuidv4()}`,
              description: 'Test metrics input in default mode',
              namespace: 'default',
              policy_id: agentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'metrics',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(200);

          expect(defaultResponse.item.inputs).to.have.length(1);
          expect(defaultResponse.item.inputs[0].type).to.be('metrics');
          expect(defaultResponse.item.inputs[0].enabled).to.be(true);

          // Test agentless deployment mode (should fail)
          await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-metrics-agentless-${uuidv4()}`,
              description: 'Test metrics input in agentless mode',
              namespace: 'default',
              policy_id: agentlessAgentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'metrics',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(400)
            .then((response) => {
              expect(response.body.message).to.contain(
                "Input metrics in deployment_modes_test is not allowed for deployment mode 'agentless'"
              );
            });
        });

        it('should allow http_endpoint input only for agentless deployment mode', async () => {
          // Test agentless deployment mode (should succeed)
          const { body: agentlessResponse } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-http-agentless-${uuidv4()}`,
              description: 'Test http_endpoint input in agentless mode',
              namespace: 'default',
              policy_id: agentlessAgentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'http_endpoint',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(200);

          expect(agentlessResponse.item.inputs).to.have.length(1);
          expect(agentlessResponse.item.inputs[0].type).to.be('http_endpoint');
          expect(agentlessResponse.item.inputs[0].enabled).to.be(true);

          // Test default deployment mode (should fail)
          await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-http-default-${uuidv4()}`,
              description: 'Test http_endpoint input in default mode',
              namespace: 'default',
              policy_id: agentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'http_endpoint',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(400)
            .then((response) => {
              expect(response.body.message).to.contain(
                "Input http_endpoint in deployment_modes_test is not allowed for deployment mode 'default'"
              );
            });
        });

        it('should fall back to blocklist for inputs without deployment_modes', async () => {
          // Test winlog input for default mode (should succeed - no blocklist for default)
          const { body: defaultResponse } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-winlog-default-${uuidv4()}`,
              description: 'Test winlog input in default mode (fallback allows all)',
              namespace: 'default',
              policy_id: agentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'winlog',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(200);

          expect(defaultResponse.item.inputs).to.have.length(1);
          expect(defaultResponse.item.inputs[0].type).to.be('winlog');
          expect(defaultResponse.item.inputs[0].enabled).to.be(true);

          // Test winlog input (blocked by AGENTLESS_DISABLED_INPUTS) for agentless mode
          const { body: agentlessResponse } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-winlog-agentless-${uuidv4()}`,
              description: 'Test winlog input in agentless mode (fallback to blocklist)',
              namespace: 'default',
              policy_id: agentlessAgentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'winlog',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(400);

          expect(agentlessResponse.message).to.contain(
            "Input winlog in deployment_modes_test is not allowed for deployment mode 'agentless'"
          );
        });
      });

      describe('agentless_only policy template', () => {
        it('should allow agentless inputs only for agentless deployment mode', async () => {
          // Test agentless deployment mode (should succeed)
          const { body: agentlessResponse } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-cloudwatch-agentless-${uuidv4()}`,
              description: 'Test cloudwatch input in agentless mode',
              namespace: 'default',
              policy_id: agentlessAgentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'cloudwatch',
                  policy_template: 'agentless_only',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(200);

          expect(agentlessResponse.item.inputs).to.have.length(1);
          expect(agentlessResponse.item.inputs[0].type).to.be('cloudwatch');

          // Test default deployment mode (should fail)
          await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-cloudwatch-default-${uuidv4()}`,
              description: 'Test cloudwatch input in default mode',
              namespace: 'default',
              policy_id: agentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'cloudwatch',
                  policy_template: 'agentless_only',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(400)
            .then((response) => {
              expect(response.body.message).to.contain(
                "Input cloudwatch in deployment_modes_test is not allowed for deployment mode 'default'"
              );
            });
        });
      });

      describe('default_only policy template', () => {
        it('should allow default inputs only for default deployment mode', async () => {
          // Test default deployment mode (should succeed)
          const { body: defaultResponse } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-filestream-default-${uuidv4()}`,
              description: 'Test filestream input in default mode',
              namespace: 'default',
              policy_id: agentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'filestream',
                  policy_template: 'default_only',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(200);

          expect(defaultResponse.item.inputs).to.have.length(1);
          expect(defaultResponse.item.inputs[0].type).to.be('filestream');

          // Test agentless deployment mode (should fail)
          await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-filestream-agentless-${uuidv4()}`,
              description: 'Test filestream input in agentless mode',
              namespace: 'default',
              policy_id: agentlessAgentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'filestream',
                  policy_template: 'default_only',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(400)
            .then((response) => {
              expect(response.body.message).to.contain(
                "Input filestream in deployment_modes_test is not allowed for deployment mode 'agentless'"
              );
            });
        });
      });

      describe('multiple inputs with mixed deployment modes', () => {
        it('should validate all inputs and reject if any are incompatible', async () => {
          // Try to create a package policy with both valid and invalid inputs for agentless
          await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-mixed-invalid-${uuidv4()}`,
              description: 'Test mixed inputs with invalid combination',
              namespace: 'default',
              policy_id: agentlessAgentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'logs',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
                {
                  type: 'metrics', // This should fail for agentless
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(400)
            .then((response) => {
              expect(response.body.message).to.contain(
                "Input metrics in deployment_modes_test is not allowed for deployment mode 'agentless'"
              );
            });
        });

        it('should succeed when all inputs are compatible with deployment mode', async () => {
          // Create a package policy with only compatible inputs for agentless
          const { body: response } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-mixed-valid-${uuidv4()}`,
              description: 'Test mixed inputs with valid combination',
              namespace: 'default',
              policy_id: agentlessAgentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'logs',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
                {
                  type: 'http_endpoint',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(200);

          expect(response.item.inputs).to.have.length(2);
          expect(response.item.inputs.map((input: any) => input.type)).to.contain('logs');
          expect(response.item.inputs.map((input: any) => input.type)).to.contain('http_endpoint');
        });
      });

      describe('disabled inputs', () => {
        it('should allow disabled inputs even if they are not compatible with deployment mode', async () => {
          // Create a package policy with a disabled metrics input for agentless (should succeed)
          const { body: response } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-disabled-${uuidv4()}`,
              description: 'Test disabled incompatible input',
              namespace: 'default',
              policy_id: agentlessAgentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'logs',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
                {
                  type: 'metrics',
                  policy_template: 'mixed_modes',
                  enabled: false, // Disabled input should be allowed
                  streams: [],
                },
              ],
            })
            .expect(200);

          expect(response.item.inputs).to.have.length(2);
          const metricsInput = response.item.inputs.find((input: any) => input.type === 'metrics');
          expect(metricsInput.enabled).to.be(false);
        });
      });

      describe('package policy updates', () => {
        let packagePolicyId: string;

        beforeEach(async () => {
          // Create a package policy for testing updates
          const { body: response } = await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-update-${uuidv4()}`,
              description: 'Test package policy for updates',
              namespace: 'default',
              policy_id: agentPolicyId,
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'logs',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(200);

          packagePolicyId = response.item.id;
        });

        it('should validate deployment modes when updating package policy inputs', async () => {
          // Try to update to add an incompatible input
          await supertest
            .put(`/api/fleet/package_policies/${packagePolicyId}`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: `deployment-test-update-${uuidv4()}`,
              description: 'Updated package policy with incompatible input',
              namespace: 'default',
              policy_id: agentlessAgentPolicyId, // Switch to agentless policy
              package: {
                name: 'deployment_modes_test',
                version: '1.0.0',
              },
              inputs: [
                {
                  type: 'logs',
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
                {
                  type: 'metrics', // This should fail for agentless
                  policy_template: 'mixed_modes',
                  enabled: true,
                  streams: [],
                },
              ],
            })
            .expect(400)
            .then((response) => {
              expect(response.body.message).to.contain(
                "Input metrics in deployment_modes_test is not allowed for deployment mode 'agentless'"
              );
            });
        });
      });
    });
  });
}
