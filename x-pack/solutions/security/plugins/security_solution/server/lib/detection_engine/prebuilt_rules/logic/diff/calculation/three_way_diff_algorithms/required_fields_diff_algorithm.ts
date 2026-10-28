/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../../../../../common/utility_types';
import type {
  RequiredFieldArray,
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
 * Diff algorithm for `required_fields`. Versions are expected to be normalized (sorted and deduplicated)
 * so they are compared by value. Conflicts are resolved in favour of the target version.
 */
export const requiredFieldsDiffAlgorithm = (
  versions: ThreeVersionsOf<RequiredFieldArray>,
  isRuleCustomized: boolean
): ThreeWayDiff<RequiredFieldArray> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  const diffOutcome = determineDiffOutcome(baseVersion, currentVersion, targetVersion);
  const valueCanUpdate = determineIfValueCanUpdate(diffOutcome);

  const hasBaseVersion = baseVersion !== MissingVersion;

  const { mergeOutcome, conflict, mergedVersion } = mergeVersions({
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
    has_update: valueCanUpdate,
    conflict,
  };
};

interface MergeResult {
  mergeOutcome: ThreeWayMergeOutcome;
  mergedVersion: RequiredFieldArray;
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs {
  currentVersion: RequiredFieldArray;
  targetVersion: RequiredFieldArray;
  diffOutcome: ThreeWayDiffOutcome;
  isRuleCustomized: boolean;
}

const mergeVersions = ({
  currentVersion,
  targetVersion,
  diffOutcome,
  isRuleCustomized,
}: MergeArgs): MergeResult => {
  switch (diffOutcome) {
    // The current version is returned as-is so that `merged_version` matches `current_version`
    // whenever `has_update` is false
    case ThreeWayDiffOutcome.StockValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: currentVersion,
        mergeOutcome: ThreeWayMergeOutcome.Current,
      };

    case ThreeWayDiffOutcome.StockValueCanUpdate: {
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
      };
    }

    // Required fields are derived from the rule's query. Merging would carry stale fields
    // forward, so the target version is proposed while the user is still able to edit it.
    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      return {
        conflict: ThreeWayDiffConflict.SOLVABLE,
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
      };
    }

    // Missing base versions always return target version
    // Scenario -AA is treated as AAA
    // https://github.com/elastic/kibana/issues/210358#issuecomment-2654492854
    case ThreeWayDiffOutcome.MissingBaseNoUpdate: {
      return {
        conflict: ThreeWayDiffConflict.NONE,
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
      };
    }

    // Missing base versions always return target version
    // If the rule is customized, we return a SOLVABLE conflict
    // Otherwise we treat scenario -AB as AAB
    // https://github.com/elastic/kibana/issues/210358#issuecomment-2654492854
    case ThreeWayDiffOutcome.MissingBaseCanUpdate: {
      return {
        conflict: isRuleCustomized ? ThreeWayDiffConflict.SOLVABLE : ThreeWayDiffConflict.NONE,
        mergedVersion: targetVersion,
        mergeOutcome: ThreeWayMergeOutcome.Target,
      };
    }

    default:
      return assertUnreachable(diffOutcome);
  }
};
