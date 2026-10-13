/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeDuration } from '@kbn/securitysolution-utils/time_duration';
import { normalizeDateMath } from '@kbn/securitysolution-utils/date_math';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import type { RuleSchedule } from '../../../../../../../../common/api/detection_engine/model/rule_schema/rule_schedule';
import type {
  ThreeVersionsOf,
  ThreeWayDiff,
} from '../../../../../../../../common/api/detection_engine';
import {
  determineDiffOutcome,
  determineIfValueCanUpdate,
  MissingVersion,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '../../../../../../../../common/api/detection_engine';

/**
 * Diff algorithm for `rule_schedule`. Versions are compared by duration, so `60m` equals `1h`
 * and `now-24h` equals `now-1d`. Merged versions keep the original (non-normalized) values.
 * `interval` and the `from` / `to` pair are merged independently: each resolves to the current
 * values when the user customized it and to the target values otherwise. `from` and `to` are never
 * split between current and target since that would result in a wrong look-back calculation.
 * A missing base version resolves in favour of the target version.
 */
export const ruleScheduleDiffAlgorithm = (
  versions: ThreeVersionsOf<RuleSchedule>,
  isRuleCustomized: boolean
): ThreeWayDiff<RuleSchedule> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  const diffOutcome = determineDiffOutcome(
    baseVersion === MissingVersion ? baseVersion : normalizeRuleSchedule(baseVersion),
    normalizeRuleSchedule(currentVersion),
    normalizeRuleSchedule(targetVersion)
  );
  const hasBaseVersion = baseVersion !== MissingVersion;
  const { mergeOutcome, conflict, mergedVersion } = mergeVersions({
    baseVersion,
    currentVersion,
    targetVersion,
    diffOutcome,
    isRuleCustomized,
  });

  return {
    has_base_version: hasBaseVersion,
    base_version: hasBaseVersion ? baseVersion : undefined,
    current_version: currentVersion,
    target_version: targetVersion,
    merged_version: mergedVersion,
    merge_outcome: mergeOutcome,
    diff_outcome: diffOutcome,
    has_update: determineIfValueCanUpdate(diffOutcome),
    conflict,
  };
};

const normalizeRuleSchedule = (schedule: RuleSchedule): RuleSchedule => ({
  interval: normalizeInterval(schedule.interval),
  from: normalizeDateMath(schedule.from),
  to: normalizeDateMath(schedule.to),
});

const normalizeInterval = (interval: string): string =>
  (TimeDuration.parse(interval) ?? new TimeDuration(5, 'm')).toString();

/**
 * Picks current values for the parts customized by the user and target values for the rest.
 * `from` and `to` are treated as a single unit.
 */
const mergeUntouchedProperties = (
  base: RuleSchedule,
  current: RuleSchedule,
  target: RuleSchedule
): RuleSchedule => {
  const isIntervalCustomized =
    normalizeInterval(base.interval) !== normalizeInterval(current.interval);
  const isRangeCustomized =
    normalizeDateMath(base.from) !== normalizeDateMath(current.from) ||
    normalizeDateMath(base.to) !== normalizeDateMath(current.to);
  const range = isRangeCustomized ? current : target;

  return {
    interval: isIntervalCustomized ? current.interval : target.interval,
    from: range.from,
    to: range.to,
  };
};

interface MergeArgs {
  baseVersion: RuleSchedule | MissingVersion;
  currentVersion: RuleSchedule;
  targetVersion: RuleSchedule;
  diffOutcome: ThreeWayDiffOutcome;
  isRuleCustomized: boolean;
}

interface MergeResult {
  mergeOutcome: ThreeWayMergeOutcome;
  mergedVersion: RuleSchedule;
  conflict: ThreeWayDiffConflict;
}

const mergeVersions = ({
  baseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
  isRuleCustomized,
}: MergeArgs): MergeResult => {
  switch (diffOutcome) {
    case ThreeWayDiffOutcome.StockValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion:
          baseVersion === MissingVersion
            ? targetVersion
            : mergeUntouchedProperties(baseVersion, currentVersion, targetVersion),
        mergeOutcome: ThreeWayMergeOutcome.Current,
      };

    case ThreeWayDiffOutcome.StockValueCanUpdate:
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
      };

    case ThreeWayDiffOutcome.CustomizedValueCanUpdate:
      return {
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
        mergedVersion: currentVersion,
        mergeOutcome: ThreeWayMergeOutcome.Current,
      };

    // Missing base versions always return the target version
    case ThreeWayDiffOutcome.MissingBaseNoUpdate:
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
      };

    case ThreeWayDiffOutcome.MissingBaseCanUpdate:
      return {
        conflict: isRuleCustomized ? ThreeWayDiffConflict.SOLVABLE : ThreeWayDiffConflict.NONE,
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
      };

    default:
      return assertUnreachable(diffOutcome);
  }
};
