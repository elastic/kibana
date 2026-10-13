/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { z } from '@kbn/zod/v4';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { policyReferenceInputSchema, toPolicyRef } from '../domain/input_schemas';
import type { EndpointPolicyBaselinePreset } from '../domain/input_schemas';
import type {
  EndpointPolicyBaseline,
  EndpointPolicySummary,
  PolicyBaselineEnvironment,
} from '../domain/normalized_endpoint_policy';
import type { NormalizedPolicyConfig } from '../domain/normalized_policy_config';
import type { PolicyIdentity } from '../services/read_policy';
import { createPolicyTool } from './create_policy_tool';
import type { PresentedPolicyIdentity, TrimLimits, TrimSummary } from './trim_policy_result';
import {
  presentBoundedIdentityStrings,
  presentWithinGuardedBudget,
  toPresentationHash,
  trimPolicyResultWithMeta,
} from './trim_policy_result';

export const GET_POLICY_TOOL_ID = 'security.policy_management.get_policy';

const GET_POLICY_MAX_RESULT_TOKENS = 12_000;

export const getPolicySchema = policyReferenceInputSchema;

type PresentedGetPolicyFallback = Readonly<{
  policy: PresentedPolicyIdentity;
  normalizedHash: string;
}>;

type PresentedGetPolicy = PresentedGetPolicyFallback &
  Readonly<{
    config: unknown;
    config_truncation?: TrimSummary;
  }>;

type PresentedBaselineReference = Readonly<{
  type: 'baseline';
  preset: EndpointPolicyBaselinePreset;
  environment: PolicyBaselineEnvironment;
}>;

type PresentedGetBaselineFallback = Readonly<{
  baseline: PresentedBaselineReference;
  normalizedHash: string;
}>;

type PresentedGetBaseline = PresentedGetBaselineFallback &
  Readonly<{
    summary: EndpointPolicySummary;
    config: unknown;
    config_truncation?: TrimSummary;
  }>;

const presentGetPolicy = (
  policy: PolicyIdentity,
  normalizedConfig: NormalizedPolicyConfig,
  serviceHash: string
): PresentedGetPolicy | PresentedGetPolicyFallback => {
  const identity = presentBoundedIdentityStrings(policy);
  const normalizedHash = toPresentationHash(serviceHash);

  const buildFull = (limits: TrimLimits): PresentedGetPolicy => {
    const trimmed = trimPolicyResultWithMeta(normalizedConfig, limits);
    return {
      policy: identity,
      normalizedHash,
      config: trimmed.value,
      ...(trimmed.summary !== undefined ? { config_truncation: trimmed.summary } : {}),
    };
  };

  const buildFallback = (): PresentedGetPolicyFallback => ({
    policy: identity,
    normalizedHash,
  });

  return presentWithinGuardedBudget(buildFull, GET_POLICY_MAX_RESULT_TOKENS, buildFallback);
};

const presentGetPolicyBaseline = (
  baseline: EndpointPolicyBaseline
): PresentedGetBaseline | PresentedGetBaselineFallback => {
  const presentedBaseline: PresentedBaselineReference = {
    type: 'baseline',
    preset: baseline.preset,
    environment: baseline.environment,
  };
  const normalizedHash = toPresentationHash(baseline.normalizedHash);

  const buildFull = (limits: TrimLimits): PresentedGetBaseline => {
    const trimmed = trimPolicyResultWithMeta(baseline.normalizedConfig, limits);
    return {
      baseline: presentedBaseline,
      normalizedHash,
      summary: baseline.summary,
      config: trimmed.value,
      ...(trimmed.summary !== undefined ? { config_truncation: trimmed.summary } : {}),
    };
  };

  const buildFallback = (): PresentedGetBaselineFallback => ({
    baseline: presentedBaseline,
    normalizedHash,
  });

  return presentWithinGuardedBudget(buildFull, GET_POLICY_MAX_RESULT_TOKENS, buildFallback);
};

export const createGetPolicyTool = ({
  endpointAppContextService,
  getStartServices,
}: {
  endpointAppContextService: EndpointAppContextService;
  getStartServices: StartServicesAccessor;
}): BuiltinSkillBoundedTool<typeof getPolicySchema> =>
  createPolicyTool({
    endpointAppContextService,
    getStartServices,
    id: GET_POLICY_TOOL_ID,
    description:
      'Get one Elastic Defend endpoint policy by saved-object id or exact name in the current space, ' +
      "or pass a preset (EDRComplete, NGAV, EDREssential, DataCollection) to read this deployment's default configuration for that preset. " +
      "A preset result is this deployment's baseline default, not a best-practice recommendation, " +
      'and reports the resolved environment (license, cloud, telemetryOptedIn; telemetryOptedIn "unresolved" means the deployment default for telemetry is unconfirmed), ' +
      'a protection-mode summary, and the normalized baseline config. ' +
      'A returned baseline config overrides any field-reference factory default for cloud- or telemetry-dependent values. ' +
      'Returns bounded identity or baseline reference, a full-config normalized hash, and a structurally bounded presented config. ' +
      'When the config is trimmed, config_truncation lists the truncation sites with paths relative to the config; ' +
      'it distinguishes string, array, and object truncation, and is capped at 50 entries with entries_truncated true disclosing further sites. ' +
      'When name_string_truncated is true, the displayed name is display-only; pass policy.id as later idOrName. ' +
      'Does not count endpoints or write policies.',
    schema: getPolicySchema,
    maxResultTokens: GET_POLICY_MAX_RESULT_TOKENS,
    run: async (reference: z.infer<typeof getPolicySchema>, service) => {
      const ref = toPolicyRef(reference);

      if (ref.type === 'baseline') {
        return presentGetPolicyBaseline(await service.getPolicyBaseline(ref.preset));
      }

      const { policy, normalizedConfig, normalizedHash } = await service.getPolicy({
        idOrName: ref.idOrName,
      });
      return presentGetPolicy(policy, normalizedConfig, normalizedHash);
    },
  });
