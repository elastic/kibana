/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from '../agents/services';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('datastream privileges', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('dynamic privileges', () => {
      // Use the dynamic_datastreams test package
      before(async () => {
        await supertest
          .post(`/api/fleet/epm/packages/dynamic_datastream/1.2.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });
      after(async () => {
        await supertest
          .delete(`/api/fleet/epm/packages/dynamic_datastream/1.2.0`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });

      it('correctly specifies wildcards for dynamic_dataset and dynamic_namespace', async () => {
        // Create agent policy
        const {
          body: {
            item: { id: agentPolicyId },
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

        // Create package policy
        const {
          body: {
            item: { id: packagePolicyId },
          },
        } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `dynamic-${uuidv4()}`,
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            package: {
              name: 'dynamic_datastream',
              version: '1.2.0',
            },
            inputs: {
              'dynamic_datastream-logfile': {
                enabled: true,
                streams: {
                  'dynamic_datastream.test_logs': {
                    enabled: true,
                    vars: {
                      paths: ['/var/log/auth.log*', '/var/log/secure*'],
                    },
                  },
                },
              },
              'dynamic_datastream-system/metrics': {
                enabled: true,
                streams: {
                  'dynamic_datastream.test_metrics': {
                    enabled: true,
                    vars: {},
                  },
                },
              },
            },
          })
          .expect(200);

        // Fetch the agent policy
        const {
          body: { item: fullAgentPolicy },
        } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
          .set('kbn-xsrf', 'xxxx');

        // Check that the privileges are correct
        expect(
          (Object.values(fullAgentPolicy.output_permissions)[0] as any)[packagePolicyId].indices
        ).to.eql([
          { names: ['logs-*-*'], privileges: ['auto_configure', 'create_doc'] },
          { names: ['metrics-*-*'], privileges: ['auto_configure', 'create_doc'] },
        ]);

        // Cleanup agent and package policy
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .send({ agentPolicyId })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });
    });
  });
}
