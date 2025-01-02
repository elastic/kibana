/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import type {
  ThreeVersionsOf,
  ThreeWayDiff,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  determineOrderAgnosticDiffOutcome,
  determineIfValueCanUpdate,
  ThreeWayDiffOutcome,
  MissingVersion,
  ThreeWayDiffConflict,
  ThreeWayMergeOutcome,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { mergeDedupedArrays } from './helpers';

/**
 * Diff algorithm used for arrays of scalar values (eg. numbers, strings, booleans, etc.)
 *
 * NOTE: Diffing logic will be agnostic to array order
 */
export const scalarArrayDiffAlgorithm = <TValue>(
  versions: ThreeVersionsOf<TValue[]>
): ThreeWayDiff<TValue[]> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  const diffOutcome = determineOrderAgnosticDiffOutcome(baseVersion, currentVersion, targetVersion);
  const valueCanUpdate = determineIfValueCanUpdate(diffOutcome);

  const hasBaseVersion = baseVersion !== MissingVersion;

  const { mergeOutcome, conflict, mergedVersion } = mergeVersions({
    baseVersion: hasBaseVersion ? baseVersion : undefined,
    currentVersion,
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
    conflict,
    has_update: valueCanUpdate,
  };
};

interface MergeResult<TValue> {
  mergeOutcome: ThreeWayMergeOutcome;
  mergedVersion: TValue[];
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs<TValue> {
  baseVersion: TValue[] | undefined;
  currentVersion: TValue[];
  targetVersion: TValue[];
  diffOutcome: ThreeWayDiffOutcome;
}

const mergeVersions = <TValue>({
  baseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
}: MergeArgs<TValue>): MergeResult<TValue> => {
  const dedupedBaseVersion = uniq(baseVersion);
  const dedupedCurrentVersion = uniq(currentVersion);
  const dedupedTargetVersion = uniq(targetVersion);

  switch (diffOutcome) {
    // Scenario -AA is treated as scenario AAA:
    // https://github.com/elastic/kibana/pull/184889#discussion_r1636421293
    case ThreeWayDiffOutcome.MissingBaseNoUpdate:
    case ThreeWayDiffOutcome.StockValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: dedupedCurrentVersion,
        mergeOutcome: ThreeWayMergeOutcome.Current,
      };

    case ThreeWayDiffOutcome.StockValueCanUpdate: {
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: dedupedTargetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
      };
    }

    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      const merged = mergeDedupedArrays(
        dedupedBaseVersion,
        dedupedCurrentVersion,
        dedupedTargetVersion
      );

      return {
        conflict: ThreeWayDiffConflict.SOLVABLE,
        mergedVersion: merged,
        mergeOutcome: ThreeWayMergeOutcome.Merged,
      };
    }
    // Scenario -AB is treated as scenario ABC, but marked as
    // SOLVABLE, and returns the target version as the merged version
    // https://github.com/elastic/kibana/pull/184889#discussion_r1636421293
    case ThreeWayDiffOutcome.MissingBaseCanUpdate: {
      return {
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
