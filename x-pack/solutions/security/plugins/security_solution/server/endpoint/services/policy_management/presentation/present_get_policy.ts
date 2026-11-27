/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointPolicyBaselinePreset } from '../domain/input_schemas';
import type {
  EndpointPolicyBaseline,
  EndpointPolicySummary,
  PolicyBaselineEnvironment,
} from '../domain/normalized_endpoint_policy';
import type { NormalizedPolicyConfig } from '../domain/normalized_policy_config';
import type { PolicyIdentity } from '../services/read_policy';
import type { PresentedPolicyIdentity, TrimLimits, TrimSummary } from './trim_policy_result';
import {
  presentBoundedIdentityStrings,
  presentWithinGuardedBudget,
  toPresentationHash,
  trimPolicyResultWithMeta,
} from './trim_policy_result';

export const GET_POLICY_MAX_RESULT_TOKENS = 12_000;

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

export const presentGetPolicy = (
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
      ...(trimmed.summary === undefined ? {} : { config_truncation: trimmed.summary }),
    };
  };

  const buildFallback = (): PresentedGetPolicyFallback => ({
    policy: identity,
    normalizedHash,
  });

  return presentWithinGuardedBudget(buildFull, GET_POLICY_MAX_RESULT_TOKENS, buildFallback);
};

export const presentGetPolicyBaseline = (
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
      ...(trimmed.summary === undefined ? {} : { config_truncation: trimmed.summary }),
    };
  };

  const buildFallback = (): PresentedGetBaselineFallback => ({
    baseline: presentedBaseline,
    normalizedHash,
  });

  return presentWithinGuardedBudget(buildFull, GET_POLICY_MAX_RESULT_TOKENS, buildFallback);
};
