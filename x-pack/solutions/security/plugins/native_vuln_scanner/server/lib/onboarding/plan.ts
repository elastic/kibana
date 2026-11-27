/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { AgentPolicyServiceInterface } from '@kbn/fleet-plugin/server';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import type {
  OnboardingPlan,
  PolicyPlan,
  PolicyRefusalReason,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import { inspectInventoryPack, planPackAction } from './pack_state';
import { mergeRuntimePin } from './runtime_pin';
import { hasUsableOsqueryManager, MIN_OSQUERY_MANAGER_VERSION } from './status';

export type {
  OnboardingPlan,
  PolicyPlan,
  PolicyPlanOutcome,
  PolicyRefusalReason,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';

const refused = (
  policy: AgentPolicy,
  reason: PolicyRefusalReason,
  message: string,
  key?: string
): PolicyPlan => ({
  id: policy.id,
  name: policy.name,
  outcome: 'refused',
  reason,
  message,
  ...(key ? { key } : {}),
  conflicts: [],
});

/**
 * Decides what pinning the osquerybeat runtime would do to one policy. Plan and apply both call
 * this, so a plan is exactly what apply would write.
 */
export const planPolicyRuntimePin = (policy: AgentPolicy): PolicyPlan => {
  // Fleet's HTTP update handler refuses agentless policies, but the service-level update this
  // route calls does not, and an agentless policy is not always `is_managed`.
  if (policy.supports_agentless) {
    return refused(
      policy,
      'agentless',
      i18n.translate('xpack.nativeVulnScanner.onboarding.agentlessPolicy', {
        defaultMessage: 'The policy is agentless and cannot run osquerybeat.',
      })
    );
  }
  if (policy.is_managed) {
    return refused(
      policy,
      'managed',
      i18n.translate('xpack.nativeVulnScanner.onboarding.managedPolicy', {
        defaultMessage: 'The policy is managed by Fleet and cannot be edited.',
      })
    );
  }
  if (!hasUsableOsqueryManager(policy)) {
    return refused(
      policy,
      'no_osquery_integration',
      i18n.translate('xpack.nativeVulnScanner.onboarding.noOsqueryIntegration', {
        defaultMessage: 'The policy has no Osquery Manager integration version {version} or later.',
        values: { version: MIN_OSQUERY_MANAGER_VERSION },
      })
    );
  }
  const settings = policy.advanced_settings;
  const internal = settings ? settings.agent_internal : undefined;
  if (internal !== undefined && internal !== null && typeof internal !== 'string') {
    return refused(
      policy,
      'invalid_agent_internal',
      i18n.translate('xpack.nativeVulnScanner.onboarding.agentInternalNotString', {
        defaultMessage: 'The agent_internal setting of the policy is not a YAML string.',
      }),
      'agent_internal'
    );
  }
  const merge = mergeRuntimePin(internal);
  if (!merge.ok) {
    return refused(policy, 'invalid_agent_internal', merge.message, merge.key);
  }
  return {
    id: policy.id,
    name: policy.name,
    outcome: merge.changed ? 'change' : 'no_change',
    ...(merge.changed ? { before: merge.before, after: merge.after } : {}),
    conflicts: merge.conflicts,
  };
};

/** Fetches the policies as the caller and plans each; ids that do not resolve are `not_found`. */
export const planPolicies = async (
  agentPolicyService: Pick<AgentPolicyServiceInterface, 'getByIds'>,
  soClient: SavedObjectsClientContract,
  policyIds: string[]
): Promise<{ policies: AgentPolicy[]; plans: PolicyPlan[] }> => {
  const policies = await agentPolicyService.getByIds(soClient, policyIds, {
    withPackagePolicies: true,
    ignoreMissing: true,
  });
  const byId = new Map(policies.map((policy) => [policy.id, policy]));
  const plans = policyIds.map((id): PolicyPlan => {
    const policy = byId.get(id);
    if (!policy) {
      return {
        id,
        name: null,
        outcome: 'not_found',
        reason: 'not_found',
        message: i18n.translate('xpack.nativeVulnScanner.onboarding.policyNotFound', {
          defaultMessage: 'The agent policy does not exist or you cannot read it.',
        }),
        conflicts: [],
      };
    }
    return planPolicyRuntimePin(policy);
  });
  return { policies, plans };
};

export const buildOnboardingPlan = async (
  agentPolicyService: Pick<AgentPolicyServiceInterface, 'getByIds'>,
  soClient: SavedObjectsClientContract,
  policyIds: string[]
): Promise<OnboardingPlan> => {
  const [{ plans }, inspection] = await Promise.all([
    planPolicies(agentPolicyService, soClient, policyIds),
    inspectInventoryPack(soClient),
  ]);
  return { pack: planPackAction(inspection, policyIds), policies: plans };
};
