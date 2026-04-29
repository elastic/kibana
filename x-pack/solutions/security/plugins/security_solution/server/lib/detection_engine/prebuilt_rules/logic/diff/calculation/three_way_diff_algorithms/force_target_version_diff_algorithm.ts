/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ThreeVersionsOf,
  ThreeWayDiff,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  MissingVersion,
  ThreeWayDiffConflict,
  ThreeWayMergeOutcome,
  determineDiffOutcome,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';

/**
 * Diff algorithm forcing target version. Useful for special fields like `version`.
 */
export const forceTargetVersionDiffAlgorithm = <TValue>(
  versions: ThreeVersionsOf<TValue>
): ThreeWayDiff<TValue> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;
  const hasBaseVersion = baseVersion !== MissingVersion;
  const hasUpdate = targetVersion !== currentVersion;

  return {
    has_base_version: hasBaseVersion,
    base_version: hasBaseVersion ? baseVersion : undefined,
    current_version: currentVersion,
    target_version: targetVersion,
    merged_version: targetVersion,
    merge_outcome: ThreeWayMergeOutcome.Target,

    diff_outcome: determineDiffOutcome(baseVersion, currentVersion, targetVersion),
    has_update: hasUpdate,
    conflict: ThreeWayDiffConflict.NONE,
  };
};
