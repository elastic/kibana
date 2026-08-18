/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreeWayDiffConflict } from '../../../../common/api/detection_engine';

/**
 * Job ids used by the fixtures. `AFFECTED_JOB_ID` is in the hardcoded
 * `common/machine_learning/affected_job_ids.ts` allowlist (a legacy job); the `_ea` ids are not.
 * Upgrading a rule from an affected job to a non-affected one is what surfaces the coverage-loss
 * conflict.
 */
export const AFFECTED_JOB_ID = 'v2_windows_rare_metadata_user';
export const REPLACEMENT_JOB_ID = 'v3_windows_rare_metadata_user_ea';
export const NON_AFFECTED_JOB_ID = 'v3_windows_rare_metadata_user_ea';
export const NON_AFFECTED_JOB_ID_2 = 'v3_linux_rare_metadata_user_ea';
/** A user-added custom job id used to make fixture B a customized rule. Not in the allowlist. */
export const CUSTOM_ML_JOB_ID = 'custom_ml_job';

export const INSTALLED_VERSION = 1;
export const TARGET_VERSION = 2;

/**
 * Expected conflict on the `machine_learning_job_id` field once the seeded rule is reviewed for
 * upgrade. `ABSENT` means the field is not part of the diff at all (used for the non-ML control).
 */
export const FIELD_ABSENT = 'ABSENT' as const;
export type ExpectedMlJobConflict =
  | ThreeWayDiffConflict.NON_SOLVABLE
  | ThreeWayDiffConflict.NONE
  | typeof FIELD_ABSENT;

/** Expected conflict on the `name` field for the name-field upgrade fixtures. */
export type ExpectedNameConflict =
  | ThreeWayDiffConflict.NONE
  | ThreeWayDiffConflict.SOLVABLE
  | ThreeWayDiffConflict.NON_SOLVABLE;

export interface SeederFixture {
  /** Unique custom rule id (won't collide with real prebuilt rules). */
  ruleId: string;
  /** Human-readable base name; the version suffix is appended per asset. */
  name: string;
  /** Type-specific fields for the installed (v1) asset — becomes base + current. */
  installed: Record<string, unknown>;
  /** Type-specific fields for the target (v2) asset. */
  target: Record<string, unknown>;
  /** Optional patch applied to the installed rule to make it a customized rule. */
  patch?: Record<string, unknown>;
  /**
   * When `true`, the installed (v1) asset is deleted after install so the three-way diff finds no
   * base version — a `MissingBaseCanUpdate` (`-AB`) outcome. The rule stays installed at v1 with a
   * v2 target available.
   */
  baseMissing?: boolean;
  /** What we expect the upgrade review to report for `machine_learning_job_id`. */
  expectedMlJobConflict: ExpectedMlJobConflict;
  /**
   * What we expect the upgrade review to report for the `name` field. Set only on the name-field
   * upgrade fixtures; ML fixtures leave it undefined and are not checked on `name`.
   */
  expectedNameConflict?: ExpectedNameConflict;
}

const mlFields = (jobIds: string[]): Record<string, unknown> => ({
  type: 'machine_learning',
  anomaly_threshold: 50,
  machine_learning_job_id: jobIds,
});

/**
 * Identical type-specific fields for both versions of the name-field upgrade fixtures, so the ONLY
 * field that differs between v1 and v2 is `name` (via the ` v1`/` v2` suffix the seeder appends).
 */
const nameQueryFields: Record<string, unknown> = {
  type: 'query',
  query: '*',
  language: 'kuery',
  index: ['*'],
};

/**
 * The fixtures the seeder installs. Each is published as a v1 ("installed") asset and a v2
 * ("target") asset so it shows up as upgradeable. Fixtures A–D demonstrate that the coverage-loss
 * conflict fires only when a legacy ML job would actually be dropped; fixtures E–H present a plain
 * `name`-field upgrade across the customized × base-version-missing matrix, for manually testing the
 * upgrade actions (with/without preview) under Enterprise, Platinum, and Basic licenses.
 */
export const FIXTURES: readonly SeederFixture[] = [
  // A — dropping a legacy job on upgrade => NON_SOLVABLE coverage-loss conflict.
  {
    ruleId: 'test-ml-coverage-loss-upgrade-rule',
    name: 'ML coverage-loss upgrade rule',
    installed: mlFields([AFFECTED_JOB_ID]),
    target: mlFields([REPLACEMENT_JOB_ID]),
    expectedMlJobConflict: ThreeWayDiffConflict.NON_SOLVABLE,
  },
  // B — same drop, but the installed rule is customized (adds a custom job) => still NON_SOLVABLE.
  {
    ruleId: 'test-ml-coverage-loss-customized-rule',
    name: 'ML coverage-loss customized rule',
    installed: mlFields([AFFECTED_JOB_ID]),
    target: mlFields([REPLACEMENT_JOB_ID]),
    patch: { machine_learning_job_id: [AFFECTED_JOB_ID, CUSTOM_ML_JOB_ID] },
    expectedMlJobConflict: ThreeWayDiffConflict.NON_SOLVABLE,
  },
  // C — ML rule repointed between two modern (non-affected) jobs => clean upgrade, no conflict.
  {
    ruleId: 'test-ml-no-conflict-upgrade-rule',
    name: 'ML no-conflict upgrade rule',
    installed: mlFields([NON_AFFECTED_JOB_ID]),
    target: mlFields([NON_AFFECTED_JOB_ID_2]),
    expectedMlJobConflict: ThreeWayDiffConflict.NONE,
  },
  // D — non-ML rule => no machine_learning_job_id field, upgrades normally (original Bug 1 control).
  {
    ruleId: 'test-query-upgrade-rule',
    name: 'Query upgrade rule',
    installed: { type: 'query', query: '*', language: 'kuery', index: ['*'] },
    target: { type: 'query', query: 'event.category: "process"', language: 'kuery', index: ['*'] },
    expectedMlJobConflict: FIELD_ABSENT,
  },
  // E — name-field upgrade, stock (not customized), base present => clean update (AAB) => NONE.
  {
    ruleId: 'test-name-upgrade-stock-with-base',
    name: 'Name upgrade (stock, base present)',
    installed: nameQueryFields,
    target: nameQueryFields,
    expectedMlJobConflict: FIELD_ABSENT,
    expectedNameConflict: ThreeWayDiffConflict.NONE,
  },
  // F — name-field upgrade, customized name, base present => customized-can-update (ABC) => NON_SOLVABLE.
  {
    ruleId: 'test-name-upgrade-customized-with-base',
    name: 'Name upgrade (customized, base present)',
    installed: nameQueryFields,
    target: nameQueryFields,
    patch: { name: 'Name upgrade (customized, base present) [user edit]' },
    expectedMlJobConflict: FIELD_ABSENT,
    expectedNameConflict: ThreeWayDiffConflict.NON_SOLVABLE,
  },
  // G — name-field upgrade, stock, base MISSING => update to target (`-AB`, not customized) => NONE.
  {
    ruleId: 'test-name-upgrade-stock-no-base',
    name: 'Name upgrade (stock, base missing)',
    installed: nameQueryFields,
    target: nameQueryFields,
    baseMissing: true,
    expectedMlJobConflict: FIELD_ABSENT,
    expectedNameConflict: ThreeWayDiffConflict.NONE,
  },
  // H — name-field upgrade, customized name, base MISSING => (`-AB`, customized) => SOLVABLE.
  {
    ruleId: 'test-name-upgrade-customized-no-base',
    name: 'Name upgrade (customized, base missing)',
    installed: nameQueryFields,
    target: nameQueryFields,
    patch: { name: 'Name upgrade (customized, base missing) [user edit]' },
    baseMissing: true,
    expectedMlJobConflict: FIELD_ABSENT,
    expectedNameConflict: ThreeWayDiffConflict.SOLVABLE,
  },
] as const;
