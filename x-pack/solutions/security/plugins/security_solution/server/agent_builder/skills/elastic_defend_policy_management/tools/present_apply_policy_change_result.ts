/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplyPolicyChangeResult } from '../services/apply_policy_change';
import type { PolicyWriteIdentity } from '../services/policy_errors';
import type {
  PresentedNormalizedDiff,
  PresentedPolicyChangeFact,
  PresentedSideEffect,
} from './assess_policy_change';
import {
  DEFAULT_TRIM_LIMITS,
  fitsGuardedEnvelope,
  presentBoundedIdentityStrings,
  presentFromTo,
  type PresentedPolicyIdentity,
  type TrimLimits,
} from './trim_policy_result';

const APPLY_POLICY_CHANGE_MAX_RESULT_TOKENS = 12_000;

type PresentedAppliedChange = Omit<PresentedPolicyChangeFact, 'registry'>;

type PresentedApplyPolicyChangeResult = Readonly<{
  before: PresentedPolicyIdentity<
    Pick<PolicyWriteIdentity, 'id' | 'name' | 'revision' | 'version'>
  >;
  after: PresentedPolicyIdentity<Pick<PolicyWriteIdentity, 'id' | 'name' | 'revision' | 'version'>>;
  appliedChanges: readonly PresentedAppliedChange[];
  sideEffects: readonly PresentedSideEffect[];
  residual: readonly PresentedNormalizedDiff[];
  enrollment: ApplyPolicyChangeResult['enrollment'];
  side_effects_value_truncated?: true;
  side_effects_value_total?: number;
  applied_changes_value_truncated?: true;
  applied_changes_value_total?: number;
  residual_value_truncated?: true;
  residual_value_total?: number;
}>;

const presentIdentity = (
  identity: PolicyWriteIdentity
): PresentedApplyPolicyChangeResult['before'] =>
  presentBoundedIdentityStrings({
    id: identity.id,
    name: identity.name,
    revision: identity.revision,
    version: identity.version,
  });

const presentFromToWithNulls = (
  entry: Readonly<{ from: unknown; to: unknown }>,
  limits: TrimLimits
) => {
  const presented = presentFromTo(entry, limits);
  return {
    ...presented,
    from: presented.from === undefined ? null : presented.from,
    to: presented.to === undefined ? null : presented.to,
  };
};

const presentChange = (
  change: ApplyPolicyChangeResult['appliedChanges'][number],
  limits: TrimLimits
): PresentedAppliedChange => {
  const { kind: originKind, ...origin } = change.origin;
  const { kind: registryKind } = change.registry;
  return {
    path: change.path,
    originKind,
    registryKind,
    origin,
    eligibility: change.eligibility,
    ...presentFromToWithNulls(change, limits),
  };
};

const presentSideEffect = (
  sideEffect: ApplyPolicyChangeResult['sideEffects'][number],
  limits: TrimLimits
): PresentedSideEffect => {
  const { kind: registryKind, ...registry } = sideEffect.registry;
  return {
    path: sideEffect.path,
    reason: sideEffect.reason,
    registryKind,
    registry,
    ...presentFromToWithNulls(sideEffect, limits),
  };
};

const presentResidual = (
  residual: ApplyPolicyChangeResult['residual'][number],
  limits: TrimLimits
): PresentedNormalizedDiff => ({
  path: residual.path,
  ...presentFromToWithNulls(residual, limits),
});

const sectionMarker = (prefix: string, kept: number, total: number) =>
  kept < total
    ? {
        [`${prefix}_value_truncated`]: true as const,
        [`${prefix}_value_total`]: total,
      }
    : {};

export const presentApplyPolicyChangeResult = (
  result: ApplyPolicyChangeResult
): PresentedApplyPolicyChangeResult => {
  const { appliedChanges, sideEffects, residual } = result;
  const identity = {
    before: presentIdentity(result.before),
    after: presentIdentity(result.after),
    enrollment: result.enrollment,
  };

  const build = (
    keepSideEffects: boolean,
    keepAppliedChanges: boolean,
    residualKeep: number
  ): PresentedApplyPolicyChangeResult => {
    const presentedSideEffects = keepSideEffects
      ? sideEffects.map((entry) => presentSideEffect(entry, DEFAULT_TRIM_LIMITS))
      : [];
    const presentedAppliedChanges = keepAppliedChanges
      ? appliedChanges.map((entry) => presentChange(entry, DEFAULT_TRIM_LIMITS))
      : [];
    const presentedResidual = residual
      .slice(0, residualKeep)
      .map((entry) => presentResidual(entry, DEFAULT_TRIM_LIMITS));

    return {
      ...identity,
      sideEffects: presentedSideEffects,
      ...sectionMarker('side_effects', presentedSideEffects.length, sideEffects.length),
      appliedChanges: presentedAppliedChanges,
      ...sectionMarker('applied_changes', presentedAppliedChanges.length, appliedChanges.length),
      residual: presentedResidual,
      ...sectionMarker('residual', presentedResidual.length, residual.length),
    };
  };

  const tryFit = (candidate: PresentedApplyPolicyChangeResult) =>
    fitsGuardedEnvelope(candidate, APPLY_POLICY_CHANGE_MAX_RESULT_TOKENS) ? candidate : undefined;

  const full = tryFit(build(true, true, residual.length));
  if (full !== undefined) {
    return full;
  }

  const withoutSideEffects = tryFit(build(false, true, residual.length));
  if (withoutSideEffects !== undefined) {
    return withoutSideEffects;
  }

  const withoutAppliedChanges = tryFit(build(false, false, residual.length));
  if (withoutAppliedChanges !== undefined) {
    return withoutAppliedChanges;
  }

  for (let keep = residual.length - 1; keep >= 0; keep -= 1) {
    const fittedResidual = tryFit(build(false, false, keep));
    if (fittedResidual !== undefined) {
      return fittedResidual;
    }
  }

  return build(false, false, 0);
};
