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
import {
  DECISION_MATCH_WORK_BUDGET_MS,
  TRIAGE_CACHE_CONFIRM_TAG_PREFIX,
  TRIAGE_STRICT_KEY_TAG_PREFIX,
  TRIAGE_WIDE_KEY_TAG_PREFIX,
} from '../../alert_triage/constants';
import { hashCandidates } from '../../alert_triage/fp_decisions';
import { hashKey } from '../../alert_triage/key_tags';
import {
  NOVELTY_GUARD,
  NOVELTY_SOURCE_FIELDS,
  checkNovelty,
  guardHitTag,
  noveltyValuesOfAlert,
} from '../../alert_triage/novelty_guard';
import { tagInChunks } from '../../alert_triage/plan_sweep';
import { buildPatternKeys, describePatternKey } from '../../alert_triage/pattern_key';
import {
  TRIAGE_CACHE_AUDIT_TAG_PREFIX,
  TRIAGE_CACHE_REUSE_TAG_PREFIX,
  TRIAGE_WOULD_REUSE_TAG_PREFIX,
  VERDICT_CACHE_NO_REUSE_KINDS,
  isAuditSample,
  matchReusableRecords,
  pickConfirmAlerts,
  type VerdictCacheMode,
  type VerdictCacheRecord,
} from '../../alert_triage/verdict_cache';
import { fetchDecisionCandidates, tagAlerts, type DecisionCursor } from './ports';
import { readCacheRecords } from './verdict_cache_store';

export interface MatchVerdictCacheStepDependencies {
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
  /** The flag mode. A missing or mistyped value reads as `off`, so it cannot tag alerts. */
  getMode: () => Promise<VerdictCacheMode>;
  /** The flag `alertzero.triageCacheConfirm`. Absent or false: no alert is tagged to confirm a pending record. */
  getCacheConfirm?: () => Promise<boolean>;
}

const TAGS_FIELD = 'kibana.alert.workflow_tags';

/** All workflow tags of a candidate (`getField` would return only the first). */
const tagsOf = (doc: Readonly<Record<string, unknown>>): string[] => {
  const value = TAGS_FIELD.split('.').reduce<unknown>(
    (current, key) =>
      typeof current === 'object' && current !== null
        ? (current as Record<string, unknown>)[key]
        : undefined,
    doc
  );
  const list = Array.isArray(value) ? value : [value];
  return list.filter((tag): tag is string => typeof tag === 'string');
};

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
  reused: 0,
  reused_false_positive: 0,
  reused_true_positive: 0,
  audit_sampled: 0,
  guard_hits: 0,
  guard_not_checked: 0,
  tag_failures: 0,
  deferred: 0,
  out_of_time: false,
  confirm_tagged: 0,
};

/**
 * Tags the pending alerts that an `active` verdict cache record covers, before the sweep plans: `az:would_reuse:<record id>`.
 * The alert is NOT taken out of analysis. In `shadow` it is analyzed as before, so the tag only shows what reuse would do, and the
 * batch compares the fresh verdict with the record. It covers the whole backlog the planner could see, not only the alerts it
 * picks, so the share of the backlog that reuse would cover can be read from the tags. An alert that carries the tag is left out of
 * later searches, so a sweep does not tag it again.
 *
 * In `on` an alert that an active record covers takes its verdict: it is tagged with the verdict (`az:false_positive` or
 * `az:true_positive`), `az:cache_reuse:<record id>` and its key tags, so the planner skips it. Two kinds of alert are analyzed
 * anyway and keep the would-reuse tag: an alert that a guard fired on, and the audit sample (`az:cache_audit:<record id>`), which
 * lets every run measure wrong reuse. A failed tag call leaves the alert pending, so it is analyzed.
 *
 * The decisions are separate: this step does not look at them. With both flags on, an alert that a decision matched can also carry
 * this tag. (shortcut: decisions first is not enforced here, because the decisions step runs first and tags what it matches.)
 *
 * With the flag `alertzero.triageCacheConfirm` on, it also tags one waiting alert of each `pending` record that many waiting alerts
 * share (`pickConfirmAlerts`) with `az:cache_confirm:<record id>`. The planner serves that alert first, so its verdict is run 2 of the
 * record sooner. The tag stays until the alert is analyzed or reused. (shortcut: a tag left on an alert whose record turned
 * `unstable` still moves it up the queue once.)
 *
 * It fails open. A step that cannot read the setting, the alerts or the records reports `failed` and tags nothing, so every
 * alert goes through analysis as before.
 */
export const getTriageMatchVerdictCacheStepDefinition = ({
  isContextEngineEnabled,
  getMode,
  getCacheConfirm = async () => false,
}: MatchVerdictCacheStepDependencies) =>
  createServerStepDefinition({
    ...triageMatchVerdictCacheStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      const result = (status: MatchVerdictCacheStatus, counts: Partial<typeof NOTHING> = {}) => ({
        output: { status, ...NOTHING, ...counts },
      });

      try {
        const mode = await getMode();
        if (mode === 'off') return result('off');
        if (!(await isContextEngineEnabled(contextManager.getFakeRequest()))) {
          return result('disabled');
        }

        // The run's own space, never an input: it is part of every key hash and of the record permissions.
        const { spaceId } = contextManager.getContext().workflow;
        const confirm = await getCacheConfirm();
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
                extraSourceFields: confirm
                  ? [...NOVELTY_SOURCE_FIELDS, TAGS_FIELD]
                  : NOVELTY_SOURCE_FIELDS,
              }
            );
            const hashes = hashCandidates(found.candidates, spaceId);
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
            const tagGuardHits = async (alertIds: readonly string[]): Promise<Set<string>> => {
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
              return alertsFired;
            };

            // `on`: the alerts that take the verdict of the record are tagged with it. They carry the key tags that the batch would
            // have written, so grouping and decisions read them like the tags of an analyzed alert.
            const tagReused = async (
              recordId: string,
              verdict: 'false_positive' | 'true_positive',
              alertIds: string[]
            ): Promise<boolean> => {
              if (alertIds.length === 0) return true;
              const [first] = alertIds;
              const strictHash = hashes.get(first);
              const firstDoc = docById.get(first);
              const wide = firstDoc === undefined ? undefined : buildPatternKeys(firstDoc).wide;
              try {
                await tagInChunks(write, {
                  alertIds,
                  add: [
                    `az:${verdict}`,
                    `${TRIAGE_CACHE_REUSE_TAG_PREFIX}${recordId}`,
                    ...(strictHash === undefined
                      ? []
                      : [`${TRIAGE_STRICT_KEY_TAG_PREFIX}${strictHash}`]),
                    ...(wide === undefined
                      ? []
                      : [`${TRIAGE_WIDE_KEY_TAG_PREFIX}${hashKey(spaceId, wide)}`]),
                  ],
                  remove: [],
                });
                return true;
              } catch (error) {
                totals.tag_failures++;
                logger.warn(
                  `Could not apply the verdict of cache record ${recordId}: ${
                    error instanceof Error ? error.message : error
                  }`
                );
                return false;
              }
            };

            for (const [recordId, { verdict, alertIds }] of matches) {
              if (outOfTime()) {
                totals.deferred++;
                continue;
              }
              try {
                if (mode === 'on') {
                  const fired = await tagGuardHits(alertIds);
                  const strictKey = recordsByHash.get(hashes.get(alertIds[0]) ?? '')?.strictKey;
                  const noReuse =
                    strictKey !== undefined &&
                    VERDICT_CACHE_NO_REUSE_KINDS.includes(describePatternKey(strictKey).kind);
                  const audit = alertIds.filter(
                    (id) => !noReuse && !fired.has(id) && isAuditSample(id)
                  );
                  const auditIds = new Set(audit);
                  const held = alertIds.filter(
                    (id) => noReuse || fired.has(id) || auditIds.has(id)
                  );
                  const reuse = alertIds.filter(
                    (id) => !noReuse && !fired.has(id) && !auditIds.has(id)
                  );
                  // Held alerts are analyzed. They carry the would-reuse tag, and the audit ones a tag of their own.
                  await tagInChunks(write, {
                    alertIds: held,
                    add: [`${TRIAGE_WOULD_REUSE_TAG_PREFIX}${recordId}`],
                    remove: [],
                  });
                  if (audit.length > 0) {
                    await tagInChunks(write, {
                      alertIds: audit,
                      add: [`${TRIAGE_CACHE_AUDIT_TAG_PREFIX}${recordId}`],
                      remove: [],
                    });
                  }
                  totals.audit_sampled += audit.length;
                  if (await tagReused(recordId, verdict, reuse)) {
                    totals.reused += reuse.length;
                    if (verdict === 'false_positive') totals.reused_false_positive += reuse.length;
                    else totals.reused_true_positive += reuse.length;
                  }
                } else {
                  await tagInChunks(write, {
                    alertIds,
                    add: [`${TRIAGE_WOULD_REUSE_TAG_PREFIX}${recordId}`],
                    remove: [],
                  });
                  await tagGuardHits(alertIds);
                }
                recordsMatched.add(recordId);
                totals.would_reuse += alertIds.length;
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

            if (confirm && !outOfTime()) {
              const alreadyTagged = new Set<string>();
              for (const { doc } of found.candidates) {
                for (const tag of tagsOf(doc)) {
                  if (tag.startsWith(TRIAGE_CACHE_CONFIRM_TAG_PREFIX)) {
                    alreadyTagged.add(tag.slice(TRIAGE_CACHE_CONFIRM_TAG_PREFIX.length));
                  }
                }
              }
              const picks = pickConfirmAlerts({ hashes, recordsByHash, now, alreadyTagged });
              for (const [recordId, alertId] of picks) {
                try {
                  await tagInChunks(write, {
                    alertIds: [alertId],
                    add: [`${TRIAGE_CACHE_CONFIRM_TAG_PREFIX}${recordId}`],
                    remove: [],
                  });
                  totals.confirm_tagged++;
                } catch (error) {
                  totals.tag_failures++;
                  logger.warn(
                    `Could not tag an alert to confirm cache record ${recordId}: ${
                      error instanceof Error ? error.message : error
                    }`
                  );
                }
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
