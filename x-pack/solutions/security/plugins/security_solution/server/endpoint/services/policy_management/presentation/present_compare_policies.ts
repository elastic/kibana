/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyDiffEntry } from '../domain/diff_policy_config';
import { describePathWritability } from '../domain/field_registry';
import type { PathNotWritableReason } from '../domain/field_registry';
import {
  canCreateMissingSetting,
  isDeviceControlEnabledPath,
  isDeviceControlUsbPath,
} from '../domain/impact/validate_set_field_value';
import type {
  EndpointPolicyBaseline,
  PolicyBaselineEnvironment,
} from '../domain/normalized_endpoint_policy';
import type { EndpointPolicyComparisonSide } from '../services/read_policy';
import type { PresentedFromTo, PresentedPolicyIdentity, TrimLimits } from './trim_policy_result';
import {
  DEFAULT_TRIM_LIMITS,
  omitTrailingToFit,
  presentBoundedIdentityStrings,
  presentFromTo,
  presentWithinGuardedBudget,
  toPresentationHash,
} from './trim_policy_result';

export const COMPARE_POLICIES_MAX_RESULT_TOKENS = 12_000;
const COMPARE_DIFF_DISPLAY_CAP = 50;

type PresentedBaselineSideReference = Readonly<{
  preset: EndpointPolicyBaseline['preset'];
  environment: PolicyBaselineEnvironment;
}>;

type PresentedComparisonSide =
  | Readonly<{
      type: 'policy';
      policy: PresentedPolicyIdentity;
      normalizedHash: string;
    }>
  | Readonly<{
      type: 'baseline';
      baseline: PresentedBaselineSideReference;
      normalizedHash: string;
    }>;

type CompareRowNotWritableReason = PathNotWritableReason | 'missing_on_one_side';

type PresentedDiffEntry = Pick<PolicyDiffEntry, 'path'> &
  PresentedFromTo &
  (
    | Readonly<{ writable: true }>
    | Readonly<{ writable: false; not_writable_reason: CompareRowNotWritableReason }>
  ) &
  Readonly<{ absent_side?: 'from' | 'to' }>;

type PresentedComparison = Readonly<{
  from: PresentedComparisonSide;
  to: PresentedComparisonSide;
  normalized_posture_equal: boolean;
  diffs: readonly PresentedDiffEntry[];
  value_total: number;
  value_truncated: boolean;
}>;

const presentComparisonSide = (side: EndpointPolicyComparisonSide): PresentedComparisonSide => {
  const normalizedHash = toPresentationHash(side.normalizedHash);

  if (side.kind === 'policy') {
    return {
      type: 'policy',
      policy: presentBoundedIdentityStrings(side.policy),
      normalizedHash,
    };
  }

  return {
    type: 'baseline',
    baseline: {
      preset: side.preset,
      environment: side.environment,
    },
    normalizedHash,
  };
};

const absentSideOf = (entry: PolicyDiffEntry): 'from' | 'to' | undefined => {
  const fromAbsent = entry.from === undefined || entry.from === null;
  const toAbsent = entry.to === undefined || entry.to === null;

  if (fromAbsent === toAbsent) {
    return undefined;
  }
  return fromAbsent ? 'from' : 'to';
};

const writableDeviceControlEnabledSibling = (
  entry: PolicyDiffEntry,
  absentSide: 'from' | 'to',
  diffs: readonly PolicyDiffEntry[]
): boolean => {
  if (!isDeviceControlUsbPath(entry.path)) {
    return false;
  }
  const os = entry.path.split('.')[0];
  return diffs.some((candidate) => {
    if (
      !isDeviceControlEnabledPath(candidate.path) ||
      candidate.path.split('.')[0] !== os ||
      absentSideOf(candidate) !== absentSide ||
      !describePathWritability(candidate.path).writable
    ) {
      return false;
    }
    const presentValue = absentSide === 'from' ? candidate.to : candidate.from;
    return presentValue === true;
  });
};

const rowWritability = (
  entry: PolicyDiffEntry,
  absentSide: 'from' | 'to' | undefined,
  diffs: readonly PolicyDiffEntry[]
): { writable: true } | { writable: false; reason: CompareRowNotWritableReason } => {
  const writability = describePathWritability(entry.path);
  if (!writability.writable) {
    return { writable: false, reason: writability.reason };
  }
  if (
    absentSide !== undefined &&
    !canCreateMissingSetting(entry.path) &&
    !writableDeviceControlEnabledSibling(entry, absentSide, diffs)
  ) {
    return { writable: false, reason: 'missing_on_one_side' };
  }
  return { writable: true };
};

const orderDiffsWritableFirst = (diffs: readonly PolicyDiffEntry[]): readonly PolicyDiffEntry[] => {
  const writable: PolicyDiffEntry[] = [];
  const notWritable: PolicyDiffEntry[] = [];

  for (const entry of diffs) {
    if (rowWritability(entry, absentSideOf(entry), diffs).writable) {
      writable.push(entry);
    } else {
      notWritable.push(entry);
    }
  }

  return [...writable, ...notWritable.slice(0, COMPARE_DIFF_DISPLAY_CAP)];
};

const presentDiffEntry = (
  entry: PolicyDiffEntry,
  limits: TrimLimits,
  diffs: readonly PolicyDiffEntry[]
): PresentedDiffEntry => {
  const presented = presentFromTo(entry, limits);
  const absentSide = absentSideOf(entry);
  const presentedEntry = {
    path: entry.path,
    ...presented,
    from: presented.from === undefined ? null : presented.from,
    to: presented.to === undefined ? null : presented.to,
    ...(absentSide !== undefined ? { absent_side: absentSide } : {}),
  };

  const writability = rowWritability(entry, absentSide, diffs);
  if (writability.writable) {
    return { ...presentedEntry, writable: true };
  }

  return {
    ...presentedEntry,
    writable: false,
    not_writable_reason: writability.reason,
  };
};

export const presentComparePolicies = (
  from: EndpointPolicyComparisonSide,
  to: EndpointPolicyComparisonSide,
  fullDiff: readonly PolicyDiffEntry[]
): PresentedComparison => {
  const presentedFrom = presentComparisonSide(from);
  const presentedTo = presentComparisonSide(to);
  const capped = orderDiffsWritableFirst(fullDiff);

  const buildSkeleton = (): PresentedComparison => ({
    from: presentedFrom,
    to: presentedTo,
    normalized_posture_equal: fullDiff.length === 0,
    diffs: [],
    value_total: fullDiff.length,
    value_truncated: fullDiff.length > 0,
  });

  const build = (keep: number, limits: TrimLimits): PresentedComparison => ({
    from: presentedFrom,
    to: presentedTo,
    normalized_posture_equal: fullDiff.length === 0,
    diffs: capped.slice(0, keep).map((entry) => presentDiffEntry(entry, limits, capped)),
    value_total: fullDiff.length,
    value_truncated: keep < fullDiff.length,
  });

  const defaultFit = omitTrailingToFit(
    (keep) => build(keep, DEFAULT_TRIM_LIMITS),
    capped.length,
    COMPARE_POLICIES_MAX_RESULT_TOKENS,
    buildSkeleton
  );
  if (defaultFit.diffs.length > 0 || fullDiff.length === 0) {
    return defaultFit;
  }

  return presentWithinGuardedBudget(
    (limits) => build(1, limits),
    COMPARE_POLICIES_MAX_RESULT_TOKENS,
    () => defaultFit
  );
};
