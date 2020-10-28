/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { skipIfNoDockerRegistry } from '../../helpers';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupIngest, getSupertestWithoutAuth } from '../fleet/agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getSupertestWithoutAuth(providerContext);
  const kibanaServer = getService('kibanaServer');

  async function getEnrollmentKeyForPolicyId(policyId: string) {
    const listRes = await supertest.get(`/api/fleet/enrollment-api-keys`).expect(200);

    const key = listRes.body.list.find(
      (item: { policy_id: string; id: string }) => item.policy_id === policyId
    );

    expect(key).not.empty();

    const res = await supertest.get(`/api/fleet/enrollment-api-keys/${key.id}`).expect(200);

    return res.body.item;
  }

  // Enroll an agent to get the actions for an agent as encrypted saved object are not expose otherwise
  async function getAgentActionsForEnrollmentKey(enrollmentAPIToken: string) {
    const kibanaVersionAccessor = kibanaServer.version;
    const kibanaVersion = await kibanaVersionAccessor.get();

    const { body: enrollmentResponse } = await supertestWithoutAuth
      .post(`/api/ingest_manager/fleet/agents/enroll`)
      .set('kbn-xsrf', 'xxx')
      .set('Authorization', `ApiKey ${enrollmentAPIToken}`)
      .send({
        type: 'PERMANENT',
        metadata: {
          local: {
            elastic: { agent: { version: kibanaVersion } },
          },
          user_provided: {},
        },
      })
      .expect(200);

    const agentAccessAPIKey = enrollmentResponse.item.access_api_key;

    // Agent checkin
    const { body: checkinApiResponse } = await supertestWithoutAuth
      .post(`/api/ingest_manager/fleet/agents/${enrollmentResponse.item.id}/checkin`)
      .set('kbn-xsrf', 'xx')
      .set('Authorization', `ApiKey ${agentAccessAPIKey}`)
      .send({
        events: [],
      })
      .expect(200);

    expect(checkinApiResponse.actions).length(1);

    return checkinApiResponse.actions[0];
  }

  // Test all the side effect that should occurs when we create|update an agent policy
  describe('ingest_manager_agent_policies_with_agents_setup', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    setupIngest(providerContext);

    describe('POST /api/fleet/agent_policies', () => {
      it('should create an enrollment key and an agent action `POLICY_CHANGE` for the policy', async () => {
        const name = `test-${Date.now()}`;

        const res = await supertest
          .post(`/api/fleet/agent_policies?sys_monitoring=true`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name,
            namespace: 'default',
          })
          .expect(200);

        const policyId = res.body.item.id;
        const enrollmentKey = await getEnrollmentKeyForPolicyId(policyId);
        expect(enrollmentKey).not.empty();

        const action = await getAgentActionsForEnrollmentKey(enrollmentKey.api_key);

        expect(action.type).to.be('POLICY_CHANGE');
        const agentPolicy = action.data.policy;
        expect(agentPolicy.id).to.be(policyId);
        // should have system inputs
        expect(agentPolicy.inputs).length(2);
        // should have default output
        expect(agentPolicy.outputs.default).not.empty();
      });
    });

    describe('POST /api/fleet/agent_policies/copy', () => {
      const TEST_POLICY_ID = `policy1`;

      it('should create an enrollment key and an agent action `POLICY_CHANGE` for the policy', async () => {
        const name = `test-${Date.now()}`;

        const res = await supertest
          .post(`/api/fleet/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name,
            description: 'Test',
          })
          .expect(200);

        const policyId = res.body.item.id;
        const enrollmentKey = await getEnrollmentKeyForPolicyId(policyId);
        expect(enrollmentKey).not.empty();

        const action = await getAgentActionsForEnrollmentKey(enrollmentKey.api_key);
        expect(action.type).to.be('POLICY_CHANGE');
        expect(action.data.policy.id).to.be(policyId);
      });
    });
  });
}
