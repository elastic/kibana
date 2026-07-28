/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeds the state needed to reproduce the ML coverage-loss upgrade behavior (#239884 / #279791):
 * a legacy ML job plus prebuilt ML rules whose upgrade would drop that job, surfacing a
 * `machine_learning_job_id` NON_SOLVABLE conflict. Also seeds control fixtures (a clean ML
 * upgrade and a non-ML rule) so you can confirm the conflict fires only when it should.
 *
 * Reusable from `scratchpad.ts`; see the "Seed ML coverage-loss upgrade conflict" example in the
 * quickstart README.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleUpgradeInfoForReview } from '../../../../common/api/detection_engine/prebuilt_rules/review_rule_upgrade/review_rule_upgrade_route.gen';
import type { Client as DetectionsClient } from '../../../../common/api/quickstart_client.gen';
import { affectedJobIds } from '../../../../common/machine_learning/affected_job_ids';
import {
  bulkWriteRuleAssets,
  deleteMlJobs,
  deleteRuleAssets,
  deleteRuleByRuleId,
  installLegacyMlJobs,
  patchRule,
  performInstallSpecificRules,
} from './api';
import { buildRuleAssetDoc, ruleAssetSavedObjectId } from './rule_assets';
import {
  AFFECTED_JOB_ID,
  FIELD_ABSENT,
  FIXTURES,
  INSTALLED_VERSION,
  TARGET_VERSION,
} from './constants';

export interface MlCoverageLossParams {
  esClient: EsClient;
  kbnClient: KbnClient;
  detectionsClient: DetectionsClient;
  log: ToolingLog;
  /**
   * Whether to create legacy ML job(s). Defaults to `true`. Set to `false` on a basic-license
   * stack (ML job creation requires a trial/platinum license); the upgrade conflict still
   * reproduces without a job installed, since the diff is content-based.
   */
  createMlJob?: boolean;
  /**
   * When `true`, install *every* job id from the hardcoded affected-jobs allowlist (not just the
   * one the rule fixtures reference). Useful for exercising the ML job compatibility callout with
   * many affected jobs (e.g. its "view all" modal). Defaults to `false`. Ignored when
   * `createMlJob` is `false`.
   */
  installAllAffectedJobs?: boolean;
}

/**
 * Runs the full seed sequence (order is load-bearing) and verifies the result. Idempotent: it
 * first tears down anything left over from a previous run.
 */
export const seedMlCoverageLossState = async ({
  esClient,
  kbnClient,
  detectionsClient,
  log,
  createMlJob = true,
  installAllAffectedJobs = false,
}: MlCoverageLossParams): Promise<void> => {
  log.info('Seeding ML coverage-loss upgrade state...');

  // The rule fixtures only need `AFFECTED_JOB_ID`; installing the whole allowlist is opt-in and
  // meant for exercising the ML job compatibility callout with many affected jobs.
  const mlJobIdsToInstall = !createMlJob
    ? []
    : installAllAffectedJobs
    ? affectedJobIds
    : [AFFECTED_JOB_ID];

  // 1. Clean slate so re-runs are idempotent (perform-install skips already-installed rules).
  await teardownMlCoverageLossState({ esClient, kbnClient, log, removeMlJob: createMlJob });

  // 2. Legacy ML job(s) (optional — needs a trial/platinum license).
  if (mlJobIdsToInstall.length > 0) {
    await installLegacyMlJobs({ kbnClient, log, jobIds: mlJobIdsToInstall });
  }

  // 3. Write the v1 assets BEFORE installing, so the real Fleet package is not fetched.
  await bulkWriteRuleAssets({
    esClient,
    log,
    docs: FIXTURES.map((fixture) =>
      buildRuleAssetDoc({
        ruleId: fixture.ruleId,
        version: INSTALLED_VERSION,
        name: `${fixture.name} v${INSTALLED_VERSION}`,
        typeSpecificFields: fixture.installed,
      })
    ),
  });

  // 4. Install v1 as real rules (current version).
  await performInstallSpecificRules({
    kbnClient,
    log,
    rules: FIXTURES.map((fixture) => ({ rule_id: fixture.ruleId, version: INSTALLED_VERSION })),
  });

  // 5. Patch the fixtures that should be customized.
  for (const fixture of FIXTURES) {
    if (fixture.patch) {
      await patchRule({ kbnClient, log, ruleId: fixture.ruleId, patch: fixture.patch });
    }
  }

  // 5b. For fixtures that should have no base version, delete their v1 asset now — after install
  // (and any patch), before publishing v2. The rule stays installed at v1, but its base lookup
  // finds nothing, yielding a MissingBaseCanUpdate (`-AB`) diff. Scoped by id so the base-present
  // fixtures keep theirs.
  const baseMissingSoIds = FIXTURES.filter((fixture) => fixture.baseMissing).map((fixture) =>
    ruleAssetSavedObjectId(fixture.ruleId, INSTALLED_VERSION)
  );
  if (baseMissingSoIds.length > 0) {
    await deleteRuleAssets({ esClient, log, soIds: baseMissingSoIds });
  }

  // 6. Publish the v2 assets — now version 2 > installed 1, so each rule is upgradeable.
  await bulkWriteRuleAssets({
    esClient,
    log,
    docs: FIXTURES.map((fixture) =>
      buildRuleAssetDoc({
        ruleId: fixture.ruleId,
        version: TARGET_VERSION,
        name: `${fixture.name} v${TARGET_VERSION}`,
        typeSpecificFields: fixture.target,
      })
    ),
  });

  // 7. Verify and log the outcome.
  await verifySeededUpgrades({ detectionsClient, log });

  log.info('Done seeding ML coverage-loss upgrade state.');
};

/**
 * Removes everything the seeder creates: the installed rules, both asset versions of each, and
 * (optionally) the legacy ML job. Safe to run repeatedly — missing resources are ignored.
 */
export const teardownMlCoverageLossState = async ({
  esClient,
  kbnClient,
  log,
  removeMlJob = true,
}: {
  esClient: EsClient;
  kbnClient: KbnClient;
  log: ToolingLog;
  removeMlJob?: boolean;
}): Promise<void> => {
  log.info('Tearing down ML coverage-loss upgrade state...');

  for (const fixture of FIXTURES) {
    await deleteRuleByRuleId({ kbnClient, log, ruleId: fixture.ruleId });
  }

  await deleteRuleAssets({
    esClient,
    log,
    soIds: FIXTURES.flatMap((fixture) =>
      [INSTALLED_VERSION, TARGET_VERSION].map((version) =>
        ruleAssetSavedObjectId(fixture.ruleId, version)
      )
    ),
  });

  // Delete the entire affected allowlist (a superset of whatever a prior run installed) so teardown
  // is robust regardless of whether that run used `installAllAffectedJobs`. Missing jobs are ignored.
  if (removeMlJob) {
    await deleteMlJobs({ kbnClient, log, jobIds: affectedJobIds });
  }
};

/**
 * Reviews the seeded rules for upgrade and logs a per-fixture PASS/FAIL table comparing the
 * expected vs actual conflict on the relevant field(s) — `machine_learning_job_id` for every
 * fixture, plus `name` for fixtures that declare `expectedNameConflict`. Returns `true` if every
 * checked field matches.
 */
export const verifySeededUpgrades = async ({
  detectionsClient,
  log,
}: {
  detectionsClient: DetectionsClient;
  log: ToolingLog;
}): Promise<boolean> => {
  const rulesById = new Map(
    (await fetchUpgradeReviewRules(detectionsClient)).map((rule) => [rule.rule_id, rule])
  );

  const rows: string[] = [];
  let allPass = true;
  for (const fixture of FIXTURES) {
    const info = rulesById.get(fixture.ruleId);
    const actual = getMlJobConflict(info);
    const nonSolvable = info?.diff.num_fields_with_non_solvable_conflicts ?? 0;
    const pass = actual === fixture.expectedMlJobConflict;
    allPass = allPass && pass;
    rows.push(
      `${pass ? 'PASS' : 'FAIL'}  ${fixture.ruleId.padEnd(42)} ml_job_conflict=${actual} ` +
        `(expected ${fixture.expectedMlJobConflict}), non_solvable_fields=${nonSolvable}`
    );

    if (fixture.expectedNameConflict !== undefined) {
      const actualName = getFieldConflict(info, 'name');
      const namePass = actualName === fixture.expectedNameConflict;
      allPass = allPass && namePass;
      rows.push(
        `${namePass ? 'PASS' : 'FAIL'}  ${fixture.ruleId.padEnd(42)} name_conflict=${actualName} ` +
          `(expected ${fixture.expectedNameConflict})`
      );
    }
  }

  log.info(`ML coverage-loss seed verification:\n${rows.join('\n')}`);
  if (allPass) {
    log.info('All fixtures match expectations.');
  } else {
    log.error('Some fixtures did not match expectations (see table above).');
  }
  return allPass;
};

const getMlJobConflict = (info: RuleUpgradeInfoForReview | undefined): string => {
  if (!info) {
    return 'NOT_UPGRADEABLE';
  }
  const field = info.diff.fields.machine_learning_job_id as { conflict?: string } | undefined;
  if (!field) {
    return FIELD_ABSENT;
  }
  return field.conflict ?? 'UNKNOWN';
};

const getFieldConflict = (
  info: RuleUpgradeInfoForReview | undefined,
  fieldName: string
): string => {
  if (!info) {
    return 'NOT_UPGRADEABLE';
  }
  const field = info.diff.fields[fieldName] as { conflict?: string } | undefined;
  if (!field) {
    return FIELD_ABSENT;
  }
  return field.conflict ?? 'UNKNOWN';
};

const fetchUpgradeReviewRules = async (
  detectionsClient: DetectionsClient
): Promise<RuleUpgradeInfoForReview[]> => {
  const perPage = 500;
  const collected: RuleUpgradeInfoForReview[] = [];
  let page = 1;
  let total = Infinity;
  while (collected.length < total) {
    const { data } = await detectionsClient.reviewRuleUpgrade({
      body: { page, per_page: perPage },
    });
    total = data.total;
    collected.push(...data.rules);
    if (data.rules.length === 0) {
      break;
    }
    page += 1;
  }
  return collected;
};
