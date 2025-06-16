/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'node-diff3';
import { assertUnreachable } from '../../../../../../../../common/utility_types';
import type {
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

/**
 * Diff algorithm used for string fields that contain multiple lines
 */
export const multiLineStringDiffAlgorithm = (
  versions: ThreeVersionsOf<string>,
  isRuleCustomized: boolean
): ThreeWayDiff<string> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  const diffOutcome = determineDiffOutcome(baseVersion, currentVersion, targetVersion);
  const valueCanUpdate = determineIfValueCanUpdate(diffOutcome);

  const hasBaseVersion = baseVersion !== MissingVersion;

  const { mergeOutcome, conflict, mergedVersion } = mergeVersions({
    baseVersion: hasBaseVersion ? baseVersion : undefined,
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
    conflict,
    has_update: valueCanUpdate,
  };
};

interface MergeResult {
  mergeOutcome: ThreeWayMergeOutcome;
  mergedVersion: string;
  conflict: ThreeWayDiffConflict;
}

interface MergeArgs {
  baseVersion: string | undefined;
  currentVersion: string;
  targetVersion: string;
  diffOutcome: ThreeWayDiffOutcome;
  isRuleCustomized: boolean;
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

    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      // TS does not realize that in ABC scenario, baseVersion cannot be missing
      // Missing baseVersion scenarios were handled as -AA and -AB.
      const mergedVersion = merge(currentVersion, baseVersion ?? '', targetVersion, {
        stringSeparator: /(\r\n|\n|\r)/g, // Separates strings by new lines
      });

      return mergedVersion.conflict
        ? {
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
            mergedVersion: currentVersion,
            mergeOutcome: ThreeWayMergeOutcome.Current,
          }
        : {
            conflict: ThreeWayDiffConflict.SOLVABLE,
            mergedVersion: mergedVersion.result.join(''),
            mergeOutcome: ThreeWayMergeOutcome.Merged,
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
    // Since multi-line string fields are mergeable, we would typically return a merged value
    // as per https://github.com/elastic/kibana/pull/211862, but with no base version we cannot
    // complete a full diff merge and so just return the target version
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
