/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('agent policy with root integrations', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('root integrations', () => {
      before(async () => {
        await supertest
          .post(`/api/fleet/epm/packages/auditd_manager/1.16.3`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });
      after(async () => {
        await supertest
          .delete(`/api/fleet/epm/packages/auditd_manager/1.16.3`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });

      it('should have root integrations in agent policy response', async () => {
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

        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `auditd-${uuidv4()}`,
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            package: {
              name: 'auditd_manager',
              version: '1.16.3',
            },
            inputs: [
              {
                type: 'audit/auditd',
                policy_template: 'auditd',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'auditd_manager.auditd' },
                    vars: {
                      socket_type: { value: '', type: 'select' },
                      immutable: { value: false, type: 'bool' },
                      resolve_ids: { value: true, type: 'bool' },
                      failure_mode: { value: 'silent', type: 'text' },
                      audit_rules: { type: 'textarea' },
                      audit_rule_files: { type: 'text' },
                      preserve_original_event: { value: false, type: 'bool' },
                      backlog_limit: { value: 8192, type: 'text' },
                      rate_limit: { value: 0, type: 'text' },
                      include_warnings: { value: false, type: 'bool' },
                      backpressure_strategy: { value: 'auto', type: 'text' },
                      tags: { value: ['auditd_manager-auditd'], type: 'text' },
                      processors: { type: 'yaml' },
                    },
                  },
                ],
              },
            ],
          })
          .expect(200);

        // Fetch the agent policy
        const {
          body: { item: agentPolicy },
        } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx');

        // Check that the root integrations are correct
        expect(
          Object.values(agentPolicy.package_policies.map((policy: any) => policy.package))
        ).to.eql([
          {
            name: 'auditd_manager',
            title: 'Auditd Manager',
            requires_root: true,
            version: '1.16.3',
          },
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
