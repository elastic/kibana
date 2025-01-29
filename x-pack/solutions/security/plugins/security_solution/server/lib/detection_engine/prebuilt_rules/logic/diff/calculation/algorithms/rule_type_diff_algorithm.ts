/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../../../../../common/utility_types';
import type {
  DiffableRuleTypes,
  ThreeVersionsOf,
  ThreeWayDiff,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  determineDiffOutcome,
  determineIfValueCanUpdate,
  MissingVersion,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';

export const ruleTypeDiffAlgorithm = <TValue extends DiffableRuleTypes>(
  versions: ThreeVersionsOf<TValue>
): ThreeWayDiff<TValue> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  const diffOutcome = determineDiffOutcome(baseVersion, currentVersion, targetVersion);
  const valueCanUpdate = determineIfValueCanUpdate(diffOutcome);

  const hasBaseVersion = baseVersion !== MissingVersion;

  const { mergeOutcome, conflict, mergedVersion } = mergeVersions({
    targetVersion,
    diffOutcome,
  });

  return {
    has_base_version: hasBaseVersion,
    base_version: hasBaseVersion ? baseVersion : undefined,
    current_version: currentVersion,
    target_version: targetVersion,
    merged_version: mergedVersion,
    merge_outcome: mergeOutcome,

    diff_outcome: diffOutcome,
    has_update: valueCanUpdate,
    conflict,
  };
};

interface MergeResult<TValue> {
  mergeOutcome: ThreeWayMergeOutcome;
  mergedVersion: TValue;
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs<TValue> {
  targetVersion: TValue;
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = <TValue>({
  targetVersion,
  diffOutcome,
}: MergeArgs<TValue>): MergeResult<TValue> => {
  switch (diffOutcome) {
    // Scenario -AA is treated as scenario AAA:
    // https://github.com/elastic/kibana/pull/184889#discussion_r1636421293
    case ThreeWayDiffOutcome.MissingBaseNoUpdate:
    case ThreeWayDiffOutcome.StockValueNoUpdate:
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
      };
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
    case ThreeWayDiffOutcome.StockValueCanUpdate:
    // NOTE: This scenario is currently inaccessible via normal UI or API workflows, but the logic is covered just in case
    case ThreeWayDiffOutcome.CustomizedValueCanUpdate:
    // Scenario -AB is treated as scenario ABC:
    // https://github.com/elastic/kibana/pull/184889#discussion_r1636421293
    case ThreeWayDiffOutcome.MissingBaseCanUpdate: {
      return {
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
