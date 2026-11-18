/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  triageMatchVerdictCacheStepCommonDefinition,
  type MatchVerdictCacheStatus,
} from '../../../common/step_types/alert_triage';
import { DECISION_MATCH_WORK_BUDGET_MS } from '../../alert_triage/constants';
import { hashCandidates } from '../../alert_triage/fp_decisions';
import {
  NOVELTY_GUARD,
  NOVELTY_SOURCE_FIELDS,
  checkNovelty,
  guardHitTag,
  noveltyValuesOfAlert,
} from '../../alert_triage/novelty_guard';
import { tagInChunks } from '../../alert_triage/plan_sweep';
import {
  TRIAGE_WOULD_REUSE_TAG_PREFIX,
  matchReusableRecords,
  type VerdictCacheMode,
  type VerdictCacheRecord,
} from '../../alert_triage/verdict_cache';
import { fetchDecisionCandidates, tagAlerts, type DecisionCursor } from './ports';
import { readCacheRecords } from './verdict_cache_store';

export interface MatchVerdictCacheStepDependencies {
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
  /** The flag mode. A missing or mistyped value reads as `off`, so it cannot tag alerts. */
  getMode: () => Promise<VerdictCacheMode>;
}

const HOUR_MS = 60 * 60 * 1000;

/** Pages read per sweep, so a huge backlog cannot hold a sweep for long. The alerts past the cap wait for a later sweep. */
const MAX_PAGES = 10;

const NOTHING = {
  candidates: 0,
  alerts_with_strict_key: 0,
  reusable_records: 0,
  would_reuse: 0,
  would_reuse_false_positive: 0,
  would_reuse_true_positive: 0,
  guard_hits: 0,
  guard_not_checked: 0,
  tag_failures: 0,
  deferred: 0,
  out_of_time: false,
};

/**
 * Tags the pending alerts that an `active` verdict cache record covers, before the sweep plans: `az:would_reuse:<record id>`.
 * The alert is NOT taken out of analysis. In `shadow` it is analyzed as before, so the tag only shows what reuse would do, and the
 * batch compares the fresh verdict with the record. It covers the whole backlog the planner could see, not only the alerts it
 * picks, so the share of the backlog that reuse would cover can be read from the tags. An alert that carries the tag is left out of
 * later searches, so a sweep does not tag it again.
 *
 * The decisions are separate: this step does not look at them. With both flags on, an alert that a decision matched can also carry
 * this tag. (shortcut: decisions first is not enforced here; add it when `on` mode of the cache is built.)
 *
 * It fails open. A step that cannot read the setting, the alerts or the records reports `failed` and tags nothing, so every
 * alert goes through analysis as before.
 */
export const getTriageMatchVerdictCacheStepDefinition = ({
  isContextEngineEnabled,
  getMode,
}: MatchVerdictCacheStepDependencies) =>
  createServerStepDefinition({
    ...triageMatchVerdictCacheStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      const result = (status: MatchVerdictCacheStatus, counts: Partial<typeof NOTHING> = {}) => ({
        output: { status, ...NOTHING, ...counts },
      });

      try {
        if ((await getMode()) === 'off') return result('off');
        if (!(await isContextEngineEnabled(contextManager.getFakeRequest()))) {
          return result('disabled');
        }

        const now = new Date();
        const workDeadline = now.getTime() + DECISION_MATCH_WORK_BUDGET_MS;
        const filters = {
          minSeverity: input.min_severity,
          excludeBuildingBlocks: input.exclude_building_blocks,
          excludedRuleTags: input.excluded_rule_tags,
        };
        const write = tagAlerts(contextManager);
        const esClient = contextManager.getScopedEsClient();
        const totals = { ...NOTHING };
        const recordsMatched = new Set<string>();
        const outOfTime = () => {
          if (Date.now() <= workDeadline) return false;
          totals.out_of_time = true;
          return true;
        };

        // A read that fails on a later page must not discard what the earlier pages tagged: those alerts carry the tag and
        // are left out of later searches, so their counts would never be reported.
        let pageFailed = false;
        try {
          let after: DecisionCursor | undefined;
          for (let page = 0; page < MAX_PAGES; page++) {
            if (outOfTime()) break;
            const found = await fetchDecisionCandidates(
              contextManager,
              input.analysis_tag_prefix,
              now.getTime() - input.lookback_hours * HOUR_MS,
              filters,
              {
                after,
                excludeTagPrefixes: [TRIAGE_WOULD_REUSE_TAG_PREFIX],
                extraSourceFields: NOVELTY_SOURCE_FIELDS,
              }
            );
            const hashes = hashCandidates(found.candidates, input.space_id);
            const stored = await readCacheRecords({
              mget: (params) => esClient.mget(params),
              hashes: [...new Set(hashes.values())],
            });
            const recordsByHash = new Map<string, VerdictCacheRecord>();
            for (const [hash, { record }] of stored) {
              if (record !== undefined) recordsByHash.set(hash, record);
            }
            const matches = matchReusableRecords({ hashes, recordsByHash, now });
            const docById = new Map(found.candidates.map(({ id, doc }) => [id, doc]));
            // The alert is tagged would-reuse first, then this adds one tag per field that the novelty guard fired on. A failed
            // guard tag is counted and does not undo the would-reuse tag.
            const tagGuardHits = async (alertIds: readonly string[]): Promise<void> => {
              const firedBy = new Map<string, string[]>();
              const alertsFired = new Set<string>();
              for (const alertId of alertIds) {
                const doc = docById.get(alertId);
                const hash = hashes.get(alertId);
                const record = hash === undefined ? undefined : recordsByHash.get(hash);
                if (doc === undefined || record === undefined) continue;
                const { fired, notChecked } = checkNovelty({
                  lists: record.novelty,
                  values: noveltyValuesOfAlert(doc),
                });
                totals.guard_not_checked += notChecked.length;
                for (const field of fired)
                  firedBy.set(field, [...(firedBy.get(field) ?? []), alertId]);
                if (fired.length > 0) alertsFired.add(alertId);
              }
              for (const [field, ids] of firedBy) {
                try {
                  await tagInChunks(write, {
                    alertIds: ids,
                    add: [guardHitTag(NOVELTY_GUARD, field)],
                    remove: [],
                  });
                } catch (error) {
                  totals.tag_failures++;
                  logger.warn(
                    `Could not tag the guard hits on ${field}: ${
                      error instanceof Error ? error.message : error
                    }`
                  );
                }
              }
              totals.guard_hits += alertsFired.size;
            };

            for (const [recordId, { verdict, alertIds }] of matches) {
              if (outOfTime()) {
                totals.deferred++;
                continue;
              }
              try {
                await tagInChunks(write, {
                  alertIds,
                  add: [`${TRIAGE_WOULD_REUSE_TAG_PREFIX}${recordId}`],
                  remove: [],
                });
                recordsMatched.add(recordId);
                totals.would_reuse += alertIds.length;
                await tagGuardHits(alertIds);
                if (verdict === 'false_positive')
                  totals.would_reuse_false_positive += alertIds.length;
                else totals.would_reuse_true_positive += alertIds.length;
              } catch (error) {
                totals.tag_failures++;
                logger.warn(
                  `Could not tag the alerts of verdict cache record ${recordId}: ${
                    error instanceof Error ? error.message : error
                  }`
                );
              }
            }

            totals.candidates += found.candidates.length;
            totals.alerts_with_strict_key += hashes.size;
            after = found.after;
            if (after === undefined) break;
          }
        } catch (error) {
          pageFailed = true;
          logger.warn(
            `Could not read a page of candidates or verdict cache records: ${
              error instanceof Error ? error.message : error
            }`
          );
        }

        return result(pageFailed ? 'failed' : 'ok', {
          ...totals,
          reusable_records: recordsMatched.size,
        });
      } catch (error) {
        logger.warn(
          `The verdict cache was not matched: ${error instanceof Error ? error.message : error}`
        );
        return result('failed');
      }
    },
  });
