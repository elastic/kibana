/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { createMockAgentPolicyService } from '@kbn/fleet-plugin/server/mocks';
import { INVENTORY_PACK_BODY, INVENTORY_PACK_NAME } from '../inventory';
import { buildOnboardingPlan, planPolicies, planPolicyRuntimePin } from './plan';
import { createPolicy, OSQUERY_PINNED_YAML } from './policy_fixture.mock';

describe('planPolicyRuntimePin', () => {
  it('plans a change with before and after for an unpinned policy', () => {
    const plan = planPolicyRuntimePin(createPolicy({ agentInternal: 'foo: bar\n' }));
    expect(plan).toMatchObject({
      id: 'policy-1',
      outcome: 'change',
      before: 'foo: bar\n',
      after: `foo: bar\n${OSQUERY_PINNED_YAML}`,
      conflicts: [],
    });
  });

  it('reports conflicting values it would overwrite', () => {
    const plan = planPolicyRuntimePin(
      createPolicy({ agentInternal: 'agent:\n  internal:\n    runtime:\n      default: otel\n' })
    );
    expect(plan.outcome).toBe('change');
    expect(plan.conflicts).toEqual([
      { key: 'agent.internal.runtime.default', from: 'otel', to: 'process' },
    ]);
  });

  it('plans no_change for an already pinned policy', () => {
    const plan = planPolicyRuntimePin(createPolicy({ agentInternal: OSQUERY_PINNED_YAML }));
    expect(plan.outcome).toBe('no_change');
    expect(plan.after).toBeUndefined();
  });

  it('refuses a managed policy', () => {
    expect(planPolicyRuntimePin(createPolicy({ isManaged: true }))).toMatchObject({
      outcome: 'refused',
      reason: 'managed',
    });
  });

  it('refuses an agentless policy even when it is not managed', () => {
    expect(
      planPolicyRuntimePin(createPolicy({ supportsAgentless: true, isManaged: false }))
    ).toMatchObject({ outcome: 'refused', reason: 'agentless' });
  });

  it.each([
    ['no osquery integration', null],
    ['an osquery integration that is too old', '0.5.0'],
  ])('refuses a policy with %s', (_, osqueryVersion) => {
    expect(planPolicyRuntimePin(createPolicy({ osqueryVersion }))).toMatchObject({
      outcome: 'refused',
      reason: 'no_osquery_integration',
    });
  });

  it('refuses an agent_internal that is not a string', () => {
    expect(planPolicyRuntimePin(createPolicy({ agentInternal: { a: 1 } }))).toMatchObject({
      outcome: 'refused',
      reason: 'invalid_agent_internal',
      key: 'agent_internal',
    });
  });

  it('refuses an agent_internal whose YAML cannot take the pin and names the key', () => {
    expect(planPolicyRuntimePin(createPolicy({ agentInternal: 'agent: foo\n' }))).toMatchObject({
      outcome: 'refused',
      reason: 'invalid_agent_internal',
      key: 'agent.internal.runtime.default',
    });
  });
});

describe('buildOnboardingPlan agentless', () => {
  it('refuses an agentless policy in the plan and never calls update', async () => {
    const agentPolicyService = createMockAgentPolicyService();
    agentPolicyService.getByIds.mockResolvedValue([
      createPolicy({ id: 'a', supportsAgentless: true }),
    ]);
    const { plans } = await planPolicies(agentPolicyService, savedObjectsClientMock.create(), [
      'a',
    ]);
    expect(plans).toEqual([
      expect.objectContaining({ id: 'a', outcome: 'refused', reason: 'agentless' }),
    ]);
    expect(agentPolicyService.update).not.toHaveBeenCalled();
  });
});

describe('planPolicies', () => {
  it('reads the policies as the caller and marks ids that do not resolve as not_found', async () => {
    const service = createMockAgentPolicyService();
    const soClient = savedObjectsClientMock.create();
    service.getByIds.mockResolvedValue([createPolicy({ id: 'a' })]);

    const { plans, policies } = await planPolicies(service, soClient, ['a', 'ghost']);

    expect(service.getByIds).toHaveBeenCalledWith(soClient, ['a', 'ghost'], {
      withPackagePolicies: true,
      ignoreMissing: true,
    });
    expect(policies.map(({ id }) => id)).toEqual(['a']);
    expect(plans.map(({ id, outcome }) => [id, outcome])).toEqual([
      ['a', 'change'],
      ['ghost', 'not_found'],
    ]);
    expect(plans[1]).toMatchObject({ name: null, reason: 'not_found' });
  });
});

describe('buildOnboardingPlan', () => {
  it('combines the pack plan and the policy plans', async () => {
    const service = createMockAgentPolicyService();
    service.getByIds.mockResolvedValue([createPolicy({ id: 'a' })]);
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'pack-1',
          type: 'osquery-pack',
          score: 1,
          attributes: {
            name: INVENTORY_PACK_NAME,
            enabled: true,
            schedule_type: INVENTORY_PACK_BODY.schedule_type,
            queries: Object.values(INVENTORY_PACK_BODY.queries),
          },
          references: [],
        },
      ],
      total: 1,
      per_page: 100,
      page: 1,
    });

    const plan = await buildOnboardingPlan(service, soClient, ['a']);

    expect(plan.pack).toMatchObject({ state: 'ok', action: 'add_policies', addPolicyIds: ['a'] });
    expect(plan.policies).toHaveLength(1);
    expect(plan.policies[0].outcome).toBe('change');
  });
});
