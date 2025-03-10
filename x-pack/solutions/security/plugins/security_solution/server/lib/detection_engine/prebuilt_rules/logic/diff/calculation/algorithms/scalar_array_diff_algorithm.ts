/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { union, uniq } from 'lodash';
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

type ScalarArrayDiffAlgorithmFn<TValue> = (
  versions: ThreeVersionsOf<TValue[]>,
  isRuleCustomized: boolean
) => ThreeWayDiff<TValue[]>;

export enum ScalarArrayDiffAlgorithmMergeStrategyEnum {
  /**
   * Merge current and target values
   */
  Merge = 'Merge',
  /**
   * Use target value
   */
  UseTarget = 'UseTarget',
}

interface ScalarArrayDiffAlgorithmOptions {
  /**
   * Algorithm's behavior when the base version is missing and current field's
   * value differs from the target value.
   */
  missingBaseCanUpdateMergeStrategy: ScalarArrayDiffAlgorithmMergeStrategyEnum;
}

/**
 * Diff algorithm used for arrays of scalar values (eg. numbers, strings, booleans, etc.)
 *
 * NOTE: Diffing logic will be agnostic to array order
 */
export function createScalarArrayDiffAlgorithm<TValue>(
  options: ScalarArrayDiffAlgorithmOptions
): ScalarArrayDiffAlgorithmFn<TValue> {
  return (versions: ThreeVersionsOf<TValue[]>, isRuleCustomized: boolean) => {
    const {
      base_version: baseVersion,
      current_version: currentVersion,
      target_version: targetVersion,
    } = versions;

    const diffOutcome = determineOrderAgnosticDiffOutcome(
      baseVersion,
      currentVersion,
      targetVersion
    );
    const valueCanUpdate = determineIfValueCanUpdate(diffOutcome);

    const hasBaseVersion = baseVersion !== MissingVersion;

    const { mergeOutcome, conflict, mergedVersion } = mergeVersions({
      baseVersion: hasBaseVersion ? baseVersion : undefined,
      currentVersion,
      targetVersion,
      diffOutcome,
      isRuleCustomized,
      options,
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
}

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
  isRuleCustomized: boolean;
  options: ScalarArrayDiffAlgorithmOptions;
}

const mergeVersions = <TValue>({
  baseVersion,
  currentVersion,
  targetVersion,
  diffOutcome,
  isRuleCustomized,
  options,
}: MergeArgs<TValue>): MergeResult<TValue> => {
  const dedupedBaseVersion = uniq(baseVersion);
  const dedupedCurrentVersion = uniq(currentVersion);
  const dedupedTargetVersion = uniq(targetVersion);

  switch (diffOutcome) {
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

    // If the rule is customized, we return a SOLVABLE conflict with a merged outcome
    // Otherwise we treat scenario -AB as AAB
    // https://github.com/elastic/kibana/issues/210358#issuecomment-2654492854
    case ThreeWayDiffOutcome.MissingBaseCanUpdate: {
      if (!isRuleCustomized) {
        return {
          mergedVersion: targetVersion,
          mergeOutcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
        };
      }

      return options.missingBaseCanUpdateMergeStrategy ===
        ScalarArrayDiffAlgorithmMergeStrategyEnum.Merge
        ? {
            mergedVersion: union(dedupedCurrentVersion, dedupedTargetVersion),
            mergeOutcome: ThreeWayMergeOutcome.Merged,
            conflict: ThreeWayDiffConflict.SOLVABLE,
          }
        : {
            mergedVersion: targetVersion,
            mergeOutcome: ThreeWayMergeOutcome.Target,
            conflict: ThreeWayDiffConflict.SOLVABLE,
          };
    }
    default:
      return assertUnreachable(diffOutcome);
  }
};
