/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z, lazySchema } from '@kbn/zod/v4';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import type { PolicyDiffEntry } from '../domain/diff_policy_config';
import { describePathWritability } from '../domain/field_registry';
import type { PathNotWritableReason } from '../domain/field_registry';
import {
  canCreateMissingSetting,
  isDeviceControlEnabledPath,
  isDeviceControlUsbPath,
} from '../domain/impact/validate_set_field_value';
import { policyReferenceInputSchema, toPolicyRef } from '../domain/input_schemas';
import type { PolicyRef } from '../domain/input_schemas';
import type {
  EndpointPolicyBaseline,
  PolicyBaselineEnvironment,
} from '../domain/normalized_endpoint_policy';
import type { EndpointPolicyComparisonSide } from '../services/read_policy';
import { createPolicyTool } from './create_policy_tool';
import type { PresentedFromTo, PresentedPolicyIdentity, TrimLimits } from './trim_policy_result';
import {
  DEFAULT_TRIM_LIMITS,
  omitTrailingToFit,
  presentBoundedIdentityStrings,
  presentFromTo,
  presentWithinGuardedBudget,
  toPresentationHash,
} from './trim_policy_result';

export const COMPARE_POLICIES_TOOL_ID = 'security.policy_management.compare_policies';

const COMPARE_DIFF_DISPLAY_CAP = 50;
const COMPARE_POLICIES_MAX_RESULT_TOKENS = 12_000;

export const comparePoliciesSchema = lazySchema(() =>
  z.object({
    from: policyReferenceInputSchema.describe(
      'Source side of the comparison: either a live policy (idOrName) or a deployment baseline (preset).'
    ),
    to: policyReferenceInputSchema.describe(
      'Target side of the comparison: either a live policy (idOrName) or a deployment baseline (preset).'
    ),
  })
);

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

const presentComparePolicies = (
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

export const createComparePoliciesTool = ({
  endpointAppContextService,
  getStartServices,
}: {
  endpointAppContextService: EndpointAppContextService;
  getStartServices: StartServicesAccessor;
}): BuiltinSkillBoundedTool<typeof comparePoliciesSchema> =>
  createPolicyTool({
    endpointAppContextService,
    getStartServices,
    id: COMPARE_POLICIES_TOOL_ID,
    description:
      'Compare two Elastic Defend policy sides in the current space. ' +
      'Each side independently accepts a live policy (idOrName) or a preset (EDRComplete, NGAV, EDREssential, DataCollection) ' +
      "for this deployment's default configuration for that preset, which is a deployment default, not a best-practice recommendation. " +
      'A baseline side reports its resolved environment instead of a policy identity. ' +
      'Returns side references, hashes, and a bounded deterministic diff, ' +
      'plus normalized_posture_equal computed from the complete normalized comparison, which excludes meta.* and *.popup.*.message. ' +
      'The visible diffs list can be bounded independently of that equality result. ' +
      'value_truncated true means the visible diffs are incomplete and value_total is the complete count; ' +
      'a from_truncation or to_truncation summary on a diff entry means that displayed value is partial. ' +
      'Each summary lists truncation sites with paths relative to that value, distinguishes string, array, and object truncation, ' +
      'and is capped at 50 entries, with entries_truncated true and entries_total disclosing further sites. ' +
      'Returned live identities follow the same rule: policy.id is the stable later idOrName, and a name with name_string_truncated true is display-only. ' +
      'A null from or to value means that path is absent on that side; when exactly one side lacks that leaf, the entry carries absent_side naming that side. ' +
      'Each diff entry carries writable and, when writable is false, not_writable_reason: one of unknown_path, derived_setting, advanced_setting, not_user_editable, coupled_only, not_supported_by_skill, or missing_on_one_side. ' +
      'missing_on_one_side means one side lacks a setting this skill cannot create. ' +
      'A one-sided *.device_control.usb_storage row is writable only when the same comparison also has a one-sided *.device_control.enabled row for that operating system whose present value is true. ' +
      'Writable entries are listed first and are never removed by the display cap. ' +
      'Does not count endpoints or write policies.',
    schema: comparePoliciesSchema,
    maxResultTokens: COMPARE_POLICIES_MAX_RESULT_TOKENS,
    run: async (
      {
        from,
        to,
      }: {
        from: z.infer<typeof comparePoliciesSchema>['from'];
        to: z.infer<typeof comparePoliciesSchema>['to'];
      },
      service
    ) => {
      const refs: Readonly<{ from: PolicyRef; to: PolicyRef }> = {
        from: toPolicyRef(from),
        to: toPolicyRef(to),
      };
      const {
        from: fromRead,
        to: toRead,
        diffs,
      } = await service.comparePolicies(refs.from, refs.to);

      return presentComparePolicies(fromRead, toRead, diffs);
    },
  });
