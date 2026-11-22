/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ALERT_ANALYSIS_FIELDS } from '@kbn/workflows/managed';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  triageJevFirstLineStepCommonDefinition,
  type JevFirstLineStatus,
} from '../../../common/step_types/alert_triage';
import {
  DECISION_MATCH_WORK_BUDGET_MS,
  TRIAGE_STRICT_KEY_TAG_PREFIX,
  TRIAGE_WIDE_KEY_TAG_PREFIX,
} from '../../alert_triage/constants';
import { hashCandidates } from '../../alert_triage/fp_decisions';
import {
  JEV_AUDIT_TAG,
  JEV_LANE_TAG_PREFIX,
  JEV_SHADOW_GUARD_HIT_TAG,
  JEV_SHADOW_LANE_TAG_PREFIX,
  JEV_SHADOW_STATE_TAG_PREFIX,
  JEV_VERDICT_TAG,
  isJevAuditSample,
  isJevEligible,
  isJevProcessShadowCandidate,
  jevBatchInput,
  jevBatchQuestions,
  laneOf,
  isNearBenignBound,
  planJevBatches,
  processKeyState,
  readJevScores,
  type JevFirstLineMode,
  type JevLane,
} from '../../alert_triage/jev_first_line';
import { hashKey } from '../../alert_triage/key_tags';
import {
  NOVELTY_SOURCE_FIELDS,
  checkNovelty,
  noveltyValuesOfAlert,
} from '../../alert_triage/novelty_guard';
import { buildPatternKeys } from '../../alert_triage/pattern_key';
import { tagInChunks } from '../../alert_triage/plan_sweep';
import { TRIAGE_WOULD_REUSE_TAG_PREFIX } from '../../alert_triage/verdict_cache';
import type { JevDecide } from './jev_client';
import { fetchDecisionCandidates, tagAlerts, type DecisionCursor } from './ports';
import { readCacheRecords } from './verdict_cache_store';

export interface JevFirstLineStepDependencies {
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
  /** The flag mode. A missing or mistyped value reads as `off`, so it cannot tag or close an alert. */
  getMode: () => Promise<JevFirstLineMode>;
  /** The id of the inference endpoint of the decision model, from a feature flag. An empty id means that none is set. */
  getEndpointId: () => Promise<string>;
  getDecide: (endpointId: string) => JevDecide;
  /** The process shadow flag (`toJevProcessShadow`). Absent reads as off. */
  getProcessShadow?: () => Promise<boolean>;
  /** A port, so that tests do not wait between the retries of a call. */
  pause?: (ms: number) => Promise<void>;
}

const HOUR_MS = 60 * 60 * 1000;

/** Pages read per sweep, so a huge backlog cannot hold a sweep for long. The alerts past the cap wait for a later sweep. */
const MAX_PAGES = 10;

/** Calls in flight at once. A few, because the endpoint answers HTTP 429 when it is pushed. */
const CONCURRENCY = 3;

const ATTEMPTS = 3;
const RETRY_PAUSE_MS = 1000;

const NOTHING = {
  candidates: 0,
  eligible: 0,
  scored: 0,
  lane_benign: 0,
  lane_attack: 0,
  lane_middle: 0,
  applied: 0,
  audit_sampled: 0,
  calls: 0,
  failed_calls: 0,
  near_bound_middle: 0,
  tag_failures: 0,
  out_of_time: false,
  shadow_eligible: 0,
  shadow_scored: 0,
  shadow_lane_benign: 0,
  shadow_lane_attack: 0,
  shadow_lane_middle: 0,
  shadow_guard_hits: 0,
  shadow_calls: 0,
  shadow_failed_calls: 0,
  shadow_errors: 0,
};

interface ScoreCounts {
  calls: number;
  failed_calls: number;
  near_bound_middle: number;
}

const defaultPause = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The Jev first line. It scores the pending alerts of the eligible kinds (registry, file and cloud) in batches of one rule and tags
 * the lane: `az:jev_lane:<lane>`. An alert that carries the tag is left out of later searches, so a sweep scores it once. In `on` an
 * alert of the benign lane also takes a false positive verdict (`az:false_positive`, `az:jev_verdict` and its key tags), so the
 * planner skips it. Every other alert, and every alert in `shadow`, is analyzed as before. A benign score from a batch of more than one
 * alert that lies near the bound (`isNearBenignBound`) goes to the middle lane, so the alert is analyzed.
 *
 * With the process shadow on, the step also scores the pending process alerts the same way and tags only the lane, the state of
 * the cache record of the key and a novelty guard hit (`az:jev_shadow_*`). It writes no verdict, so they are analyzed as before.
 *
 * It fails open. A call that fails three times leaves its alerts untagged, so they are analyzed. A step that cannot read the setting
 * or the alerts reports `failed`. The decisions and the verdict cache run before it: an alert that they tagged is not scored.
 */
export const getTriageJevFirstLineStepDefinition = ({
  isContextEngineEnabled,
  getMode,
  getEndpointId,
  getDecide,
  getProcessShadow = async () => false,
  pause = defaultPause,
}: JevFirstLineStepDependencies) =>
  createServerStepDefinition({
    ...triageJevFirstLineStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      const result = (status: JevFirstLineStatus, counts: Partial<typeof NOTHING> = {}) => ({
        output: { status, ...NOTHING, ...counts },
      });

      try {
        const mode = await getMode();
        if (mode === 'off') return result('off');
        if (!(await isContextEngineEnabled(contextManager.getFakeRequest()))) {
          return result('disabled');
        }

        const endpointId = await getEndpointId();
        if (endpointId === '') {
          logger.warn(
            'The decision model has no endpoint (feature flag alertzero.triageJevEndpointId), so no alert is scored.'
          );
          return result('failed');
        }

        const now = new Date();
        const workDeadline = now.getTime() + DECISION_MATCH_WORK_BUDGET_MS;
        const filters = {
          minSeverity: input.min_severity,
          excludeBuildingBlocks: input.exclude_building_blocks,
          excludedRuleTags: input.excluded_rule_tags,
        };
        const write = tagAlerts(contextManager);
        const decide = getDecide(endpointId);
        const processShadow = await getProcessShadow();
        const totals = { ...NOTHING };
        const outOfTime = () => {
          if (Date.now() <= workDeadline) return false;
          totals.out_of_time = true;
          return true;
        };

        const callWithRetry = async (text: string, count: number) => {
          for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
            try {
              return await decide(text, jevBatchQuestions(count));
            } catch (error) {
              if (attempt === ATTEMPTS) {
                logger.warn(
                  `The decision model did not answer: ${
                    error instanceof Error ? error.message : error
                  }`
                );
                return undefined;
              }
              await pause(RETRY_PAUSE_MS * attempt);
            }
          }
          return undefined;
        };

        const tag = async (alertIds: string[], add: string[]): Promise<boolean> => {
          try {
            await tagInChunks(write, { alertIds, add, remove: [] });
            return true;
          } catch (error) {
            totals.tag_failures++;
            logger.warn(
              `Could not tag ${alertIds.length} alerts with ${add[0]}: ${
                error instanceof Error ? error.message : error
              }`
            );
            return false;
          }
        };

        // Scores alerts in batches, a few calls at a time. A benign score near the bound goes to the middle lane, because the
        // other attacks of a batch can pull an attack's score down. An alert without a score has no lane and is analyzed.
        const scoreLanes = async (
          alerts: ReadonlyArray<{ id: string; doc: Readonly<Record<string, unknown>> }>,
          counts: ScoreCounts
        ): Promise<Map<string, JevLane>> => {
          const lanes = new Map<string, JevLane>();
          const batches = planJevBatches(alerts);
          let next = 0;
          const worker = async (): Promise<void> => {
            while (next < batches.length) {
              const batch = batches[next++];
              if (outOfTime()) return;
              counts.calls++;
              const answers = await callWithRetry(
                jevBatchInput(batch.map(({ doc }) => doc)),
                batch.length
              );
              if (answers === undefined) {
                counts.failed_calls++;
                continue;
              }
              readJevScores(answers, batch.length).forEach((score, index) => {
                if (score === undefined) return;
                const nearBound = isNearBenignBound(score, batch.length);
                if (nearBound) counts.near_bound_middle++;
                lanes.set(batch[index].id, nearBound ? 'middle' : laneOf(score));
              });
            }
          };
          await Promise.all(Array.from({ length: CONCURRENCY }, worker));

          return lanes;
        };

        // The process shadow: a measurement only. It scores process alerts like the first line and tags the lane, the state of
        // the cache record of the key and a guard hit. It writes no verdict. A failure here is counted and logged, and does not
        // stop the step, because no alert depends on it.
        const shadowProcessAlerts = async (
          alerts: ReadonlyArray<{ id: string; doc: Readonly<Record<string, unknown>> }>,
          strictHashes: ReadonlyMap<string, string>
        ): Promise<void> => {
          if (alerts.length === 0) return;
          try {
            totals.shadow_eligible += alerts.length;
            const stored = await readCacheRecords({
              mget: (params) => contextManager.getScopedEsClient().mget(params),
              hashes: [...new Set(alerts.flatMap(({ id }) => strictHashes.get(id) ?? []))],
            });
            const counts: ScoreCounts = {
              calls: 0,
              failed_calls: 0,
              near_bound_middle: 0,
            };
            const lanes = await scoreLanes(alerts, counts);
            totals.shadow_calls += counts.calls;
            totals.shadow_failed_calls += counts.failed_calls;
            const byTags = new Map<string, string[]>();
            for (const { id, doc } of alerts) {
              const lane = lanes.get(id);
              if (lane === undefined) continue;
              const hash = strictHashes.get(id);
              const record = hash === undefined ? undefined : stored.get(hash)?.record;
              const fired =
                record !== undefined &&
                checkNovelty({ lists: record.novelty, values: noveltyValuesOfAlert(doc) }).fired
                  .length > 0;
              const tags = [
                `${JEV_SHADOW_LANE_TAG_PREFIX}${lane}`,
                `${JEV_SHADOW_STATE_TAG_PREFIX}${processKeyState(record, now)}`,
                ...(fired ? [JEV_SHADOW_GUARD_HIT_TAG] : []),
              ];
              byTags.set(tags.join(' '), [...(byTags.get(tags.join(' ')) ?? []), id]);
            }
            for (const [joined, ids] of byTags) {
              const tags = joined.split(' ');
              if (!(await tag(ids, tags))) continue;
              totals.shadow_scored += ids.length;
              const lane = tags[0].slice(JEV_SHADOW_LANE_TAG_PREFIX.length) as JevLane;
              totals[`shadow_lane_${lane}`] += ids.length;
              if (tags.includes(JEV_SHADOW_GUARD_HIT_TAG)) totals.shadow_guard_hits += ids.length;
            }
          } catch (error) {
            totals.shadow_errors++;
            logger.warn(
              `The process shadow did not run on ${alerts.length} alerts: ${
                error instanceof Error ? error.message : error
              }`
            );
          }
        };

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
                excludeTagPrefixes: [
                  JEV_LANE_TAG_PREFIX,
                  JEV_SHADOW_LANE_TAG_PREFIX,
                  TRIAGE_WOULD_REUSE_TAG_PREFIX,
                ],
                extraSourceFields: processShadow
                  ? [...new Set([...ALERT_ANALYSIS_FIELDS, ...NOVELTY_SOURCE_FIELDS])]
                  : ALERT_ANALYSIS_FIELDS,
              }
            );
            const strictHashes = hashCandidates(found.candidates, input.space_id);
            const eligible = found.candidates.filter(({ doc }) => isJevEligible(doc));
            const docById = new Map(eligible.map(({ id, doc }) => [id, doc]));

            const lanes = await scoreLanes(eligible, totals);

            // Tag the lanes. In `on` the benign lane also takes the verdict.
            for (const lane of ['benign', 'attack', 'middle'] as const) {
              const ids = [...lanes].filter(([, value]) => value === lane).map(([id]) => id);
              if (ids.length === 0) continue;
              const apply = mode === 'on' && lane === 'benign';
              const laneTag = `${JEV_LANE_TAG_PREFIX}${lane}`;
              // In `on` a small sample of the benign lane keeps its lane tag and gets no verdict, so that the model decides.
              const audit = apply ? ids.filter((id) => isJevAuditSample(id)) : [];
              const auditIds = new Set(audit);
              const decided = ids.filter((id) => !auditIds.has(id));
              if (audit.length > 0 && (await tag(audit, [laneTag, JEV_AUDIT_TAG]))) {
                totals.scored += audit.length;
                totals.lane_benign += audit.length;
                totals.audit_sampled += audit.length;
              }
              if (decided.length === 0) continue;
              const tagged = await tag(decided, [
                ...(apply ? ['az:false_positive', JEV_VERDICT_TAG] : []),
                laneTag,
              ]);
              if (!tagged) continue;
              totals.scored += decided.length;
              totals[`lane_${lane}`] += decided.length;
              if (!apply) continue;
              totals.applied += decided.length;
              // The key tags that a batch would have written, one call for each key, so that grouping and decisions read them.
              const byKey = new Map<string, string[]>();
              for (const id of decided) {
                const hash = strictHashes.get(id);
                if (hash !== undefined) byKey.set(hash, [...(byKey.get(hash) ?? []), id]);
              }
              for (const [hash, keyIds] of byKey) {
                const doc = docById.get(keyIds[0]);
                const wide = doc === undefined ? undefined : buildPatternKeys(doc).wide;
                await tag(keyIds, [
                  `${TRIAGE_STRICT_KEY_TAG_PREFIX}${hash}`,
                  ...(wide === undefined
                    ? []
                    : [`${TRIAGE_WIDE_KEY_TAG_PREFIX}${hashKey(input.space_id, wide)}`]),
                ]);
              }
            }

            if (processShadow) {
              await shadowProcessAlerts(
                found.candidates.filter(({ doc }) => isJevProcessShadowCandidate(doc)),
                strictHashes
              );
            }

            totals.candidates += found.candidates.length;
            totals.eligible += eligible.length;
            after = found.after;
            if (after === undefined) break;
          }
        } catch (error) {
          pageFailed = true;
          logger.warn(
            `Could not read a page of candidates: ${error instanceof Error ? error.message : error}`
          );
        }

        return result(pageFailed ? 'failed' : 'ok', totals);
      } catch (error) {
        logger.warn(
          `The decision model first line did not run: ${
            error instanceof Error ? error.message : error
          }`
        );
        return result('failed');
      }
    },
  });
