/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  AGENT_POLICY_INDEX,
  AGENT_UPDATE_LAST_CHECKIN_INTERVAL_MS,
} from '@kbn/fleet-plugin/common';
import { ENROLLMENT_API_KEYS_INDEX } from '@kbn/fleet-plugin/common/constants';
import { skipIfNoDockerRegistry } from '../../helpers';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');

  async function getEnrollmentKeyForPolicyId(policyId: string) {
    const listRes = await supertest.get(`/api/fleet/enrollment_api_keys`).expect(200);

    const key = listRes.body.items.find(
      (item: { policy_id: string; id: string }) => item.policy_id === policyId
    );

    expect(key).not.empty();

    const res = await supertest.get(`/api/fleet/enrollment_api_keys/${key.id}`).expect(200);

    return res.body.item;
  }

  async function assertFleetServerPoliciesForPolicy(policyId: string, spaceId?: string) {
    const res = await esClient.search({
      index: AGENT_POLICY_INDEX,
      ignore_unavailable: true,
      body: {
        query: {
          term: {
            policy_id: policyId,
          },
        },
        size: 1,
        sort: [{ revision_idx: { order: 'desc' } }],
      },
    });

    if (spaceId) {
      const docsSpaceId = res.hits.hits.flatMap((hit) => (hit._source as any).namespaces)?.[0];
      expect(docsSpaceId).to.eql(docsSpaceId);
    }

    // @ts-expect-error TotalHit
    expect(res.hits.total.value !== 0).to.be(true);
  }

  async function assertHasFleetServerEnrollmentApiKeyForPolicy(policyId: string, spaceId?: string) {
    const res = await esClient.search({
      index: ENROLLMENT_API_KEYS_INDEX,
      ignore_unavailable: true,
      body: {
        query: {
          term: {
            policy_id: policyId,
          },
        },
        size: 1,
      },
    });

    if (spaceId) {
      const docsSpaceId = res.hits.hits.flatMap((hit) => (hit._source as any).namespaces)?.[0];
      expect(docsSpaceId).to.eql(docsSpaceId);
    }

    // @ts-expect-error TotalHit
    expect(res.hits.total.value !== 0).to.be(true);
  }

  // Test all the side effect that should occurs when we create|update an agent policy
  describe('fleet_agent_policies_with_agents_setup', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
    });
    after(async () => {
      // Wait before agent status is updated
      return new Promise((resolve) => setTimeout(resolve, AGENT_UPDATE_LAST_CHECKIN_INTERVAL_MS));
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    setupFleetAndAgents(providerContext);

    describe('In default space', () => {
      describe('POST /api/fleet/agent_policies', () => {
        it('should create an enrollment key for the policy', async () => {
          const name = `test-${Date.now()}`;

          const res = await supertest
            .post(`/s/test/api/fleet/agent_policies?sys_monitoring=true`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name,
              namespace: 'default',
            })
            .expect(200);

          const policyId = res.body.item.id;
          const enrollmentKey = await getEnrollmentKeyForPolicyId(policyId);
          expect(enrollmentKey).not.empty();

          await assertFleetServerPoliciesForPolicy(policyId);
        });
      });

      describe('POST /api/fleet/agent_policies/copy', () => {
        const TEST_POLICY_ID = `policy1`;

        it('should create an enrollment key for the policy', async () => {
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

          await assertFleetServerPoliciesForPolicy(policyId);
        });
      });
    });

    describe('In a non default space', () => {
      const SPACE_ID = 'test';
      before(async () => {
        await kibanaServer.spaces
          .create({
            id: SPACE_ID,
            name: SPACE_ID,
          })
          .catch((err) => {});
      });
      describe('POST /s/test/api/fleet/agent_policies', () => {
        it('should create an .fleet-policy and .fleet-enrollment key for the policy', async () => {
          const name = `test-${Date.now()}`;

          const res = await supertest
            .post(`/s/${SPACE_ID}/api/fleet/agent_policies?sys_monitoring=true`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name,
              namespace: 'default',
            })
            .expect(200);

          const policyId = res.body.item.id;

          await assertHasFleetServerEnrollmentApiKeyForPolicy(policyId, SPACE_ID);
          await assertFleetServerPoliciesForPolicy(policyId, SPACE_ID);
        });
      });
    });
  });
}
