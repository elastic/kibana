/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, sortBy } from 'lodash';
import type {
  ThreeVersionsOf,
  ThreeWayDiff,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  MissingVersion,
  ThreeWayDiffConflict,
  ThreeWayMergeOutcome,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import type { MachineLearningJobId } from '../../../../../../../../common/api/detection_engine/model/rule_schema';
import { isMlJobCoverageLossUpgrade } from '../../../../../../../../common/detection_engine/prebuilt_rules/diff/is_ml_job_coverage_loss_upgrade';
import { simpleDiffAlgorithm } from './simple_diff_algorithm';

/**
 * Diff algorithm for a prebuilt ML rule's `machine_learning_job_id` field.
 *
 * It behaves like the default field diff, with two ML-specific properties:
 *
 * 1. The field is compared as an unordered set of job ids. Cosmetic differences - order,
 *    duplicates, or a single id expressed as a string vs. a one-element array - are not treated as
 *    updates. The merged value is always one of the original version values.
 *
 * 2. When upgrading would remove a legacy ("affected") ML job that the current version references
 *    but the target version no longer does, the algorithm returns a `NON_SOLVABLE` conflict and
 *    keeps the current value. This prevents a silent loss of detection coverage for ML rule users.
 *    We detect such conflicts purely from the version triad + the hardcoded list of legacy ML jobs
 *    (see `isMlJobCoverageLossUpgrade`); we do not check whether the jobs are actually installed.
 */
export const machineLearningJobIdDiffAlgorithm = (
  versions: ThreeVersionsOf<MachineLearningJobId>,
  isRuleCustomized: boolean
): ThreeWayDiff<MachineLearningJobId> => {
  const {
    base_version: baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
  } = versions;

  // Diff on the canonical representation so that ordering, duplicates, and string-vs-array
  // differences don't register as updates.
  const canonicalVersions: ThreeVersionsOf<string[]> = {
    base_version: baseVersion === MissingVersion ? MissingVersion : toCanonicalJobIds(baseVersion),
    current_version: toCanonicalJobIds(currentVersion),
    target_version: toCanonicalJobIds(targetVersion),
  };

  const canonicalDiff = simpleDiffAlgorithm<string[]>(canonicalVersions, isRuleCustomized);

  // `simpleDiffAlgorithm` only ever merges to the current or target version.
  const diff: ThreeWayDiff<MachineLearningJobId> = {
    ...canonicalDiff,
    base_version: baseVersion === MissingVersion ? undefined : baseVersion,
    current_version: currentVersion,
    target_version: targetVersion,
    merged_version:
      canonicalDiff.merge_outcome === ThreeWayMergeOutcome.Target ? targetVersion : currentVersion,
  };

  if (isMlJobCoverageLossUpgrade(currentVersion, targetVersion)) {
    return {
      ...diff,
      merged_version: currentVersion,
      merge_outcome: ThreeWayMergeOutcome.Current,
      conflict: ThreeWayDiffConflict.NON_SOLVABLE,
    };
  }

  return diff;
};

/**
 * `machine_learning_job_id` denotes an unordered set of ML jobs a rule runs against, expressed as
 * either a single id or a list of ids. Normalize any representation to a canonical (de-duplicated,
 * sorted) array so that set-equality can be tested with a plain `isEqual` comparison.
 */
const toCanonicalJobIds = (jobIds: MachineLearningJobId): string[] => {
  const idsArray = Array.isArray(jobIds) ? jobIds : [jobIds];
  const idsDeduped = uniq(idsArray);
  const idsSorted = sortBy(idsDeduped);
  return idsSorted;
};
