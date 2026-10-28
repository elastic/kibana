/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { HUNT_COVERAGE_AI_INDEX_DEST } from '../../../common/step_types/package_report';
import {
  triageMatchFpDecisionsStepCommonDefinition,
  type MatchFpDecisionsStatus,
} from '../../../common/step_types/alert_triage';
import {
  DECISION_AUTO_CLOSE_SEVERITIES,
  TRIAGE_WOULD_CLOSE_TAG_PREFIX,
  TRIAGE_WOULD_SKIP_TAG_PREFIX,
  type DecisionAutoCloseMode,
} from '../../alert_triage/constants';
import {
  decisionId,
  hashCandidates,
  matchDecisions,
  readActiveDecision,
  type StoredDecision,
} from '../../alert_triage/fp_decisions';
import { tagInChunks } from '../../alert_triage/plan_sweep';
import { fetchDecisionCandidates, statusCodeOf, tagAlerts } from './ports';

export interface MatchFpDecisionsStepDependencies {
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
  /** The kill switch. Anything but `off` is shadow, so a mistyped value cannot close alerts. */
  getMode: () => Promise<DecisionAutoCloseMode>;
}

const HOUR_MS = 60 * 60 * 1000;

/** Ids per `mget`, well under the request size limit. */
const MGET_CHUNK = 1000;

/**
 * Pages read per sweep, so a huge backlog cannot hold a sweep for long. shortcut: the alerts past
 * the cap wait for a later sweep, once the matched ones ahead of them are tagged and left out of
 * the search, or have aged out; raise it if a space regularly has more than this many open alerts.
 */
const MAX_PAGES = 10;

const NOTHING = {
  candidates: 0,
  decisions_matched: 0,
  would_close: 0,
  would_skip: 0,
  excluded_by_severity: 0,
  tag_failures: 0,
};

/**
 * Matches the open backlog against the stored decisions, before the sweep plans. It covers the
 * whole backlog the planner could see, not only the alerts it picks, so a match never uses the
 * analysis budget.
 *
 * In `shadow` it only tags: `az:would_close:<decision>` for a false positive decision, and
 * `az:would_skip:<decision>` for a dismissed pattern. The alert still goes through analysis and
 * grouping, so shadow changes no outcome and shows what `on` would do.
 *
 * It fails open. A step that cannot read the setting, the decisions or the alerts reports `failed`
 * and matches nothing, so every alert goes through analysis as before.
 */
export const getTriageMatchFpDecisionsStepDefinition = ({
  isContextEngineEnabled,
  getMode,
}: MatchFpDecisionsStepDependencies) =>
  createServerStepDefinition({
    ...triageMatchFpDecisionsStepCommonDefinition,
    handler: async ({ input, contextManager, logger }) => {
      const result = (status: MatchFpDecisionsStatus, counts: Partial<typeof NOTHING> = {}) => ({
        output: { status, ...NOTHING, ...counts },
      });

      try {
        if ((await getMode()) === 'off') return result('off');
        if (!(await isContextEngineEnabled(contextManager.getFakeRequest()))) {
          return result('disabled');
        }

        const now = Date.now();
        const filters = {
          minSeverity: input.min_severity,
          excludeBuildingBlocks: input.exclude_building_blocks,
          excludedRuleTags: input.excluded_rule_tags,
        };
        const write = tagAlerts(contextManager);
        const totals = {
          candidates: 0,
          closed: 0,
          skipped: 0,
          matched: 0,
          excluded: 0,
          failures: 0,
        };
        const decisionsSeen = new Set<string>();

        const tag = async (prefix: string, byDecision: Map<string, string[]>) => {
          for (const [id, alertIds] of byDecision) {
            try {
              await tagInChunks(write, { alertIds, add: [`${prefix}${id}`], remove: [] });
            } catch (error) {
              totals.failures++;
              logger.warn(
                `Could not tag the alerts of decision ${id}: ${
                  error instanceof Error ? error.message : error
                }`
              );
            }
          }
        };
        const count = (byDecision: Map<string, string[]>) =>
          [...byDecision.values()].reduce((sum, ids) => sum + ids.length, 0);

        let after: unknown[] | undefined;
        for (let page = 0; page < MAX_PAGES; page++) {
          const found = await fetchDecisionCandidates(
            contextManager,
            input.analysis_tag_prefix,
            now - input.lookback_hours * HOUR_MS,
            filters,
            after
          );
          const hashes = hashCandidates(found.candidates, input.space_id);
          const matches = matchDecisions({
            candidates: found.candidates,
            hashes,
            decisionsByHash: await readDecisions({
              mget: (params) => contextManager.getScopedEsClient().mget(params),
              hashes: new Set(hashes.values()),
              now,
            }),
            severities: DECISION_AUTO_CLOSE_SEVERITIES,
          });
          await tag(TRIAGE_WOULD_CLOSE_TAG_PREFIX, matches.wouldClose);
          await tag(TRIAGE_WOULD_SKIP_TAG_PREFIX, matches.wouldSkip);

          totals.candidates += found.candidates.length;
          totals.closed += count(matches.wouldClose);
          totals.skipped += count(matches.wouldSkip);
          totals.excluded += matches.excludedBySeverity;
          for (const id of [...matches.wouldClose.keys(), ...matches.wouldSkip.keys()]) {
            decisionsSeen.add(id);
          }
          after = found.after;
          if (after === undefined) break;
        }

        return result('ok', {
          candidates: totals.candidates,
          decisions_matched: decisionsSeen.size,
          would_close: totals.closed,
          would_skip: totals.skipped,
          excluded_by_severity: totals.excluded,
          tag_failures: totals.failures,
        });
      } catch (error) {
        logger.warn(
          `Triage decisions were not matched: ${error instanceof Error ? error.message : error}`
        );
        return result('failed');
      }
    },
  });

interface MgetResponse {
  docs: Array<{ _id: string; found?: boolean; _source?: Record<string, unknown> }>;
}

/**
 * Reads the decisions of the given key hashes by their ids: one read per hash and kind, no search,
 * so no field mapping is needed and expiry is checked here. A missing index means no decisions.
 */
const readDecisions = async ({
  mget,
  hashes,
  now,
}: {
  mget: (params: { index: string; ids: string[] }) => Promise<unknown>;
  hashes: ReadonlySet<string>;
  now: number;
}): Promise<Map<string, StoredDecision[]>> => {
  const idToHash = new Map<string, string>();
  for (const hash of hashes) {
    idToHash.set(decisionId('false_positive', hash), hash);
    idToHash.set(decisionId('do_not_propose', hash), hash);
  }
  const ids = [...idToHash.keys()];
  const found = new Map<string, StoredDecision[]>();
  for (let from = 0; from < ids.length; from += MGET_CHUNK) {
    let response: MgetResponse;
    try {
      response = (await mget({
        index: HUNT_COVERAGE_AI_INDEX_DEST.value,
        ids: ids.slice(from, from + MGET_CHUNK),
      })) as MgetResponse;
    } catch (error) {
      if (statusCodeOf(error) === 404) return found;
      throw error;
    }
    for (const doc of response.docs) {
      if (doc.found !== true) continue;
      const decision = readActiveDecision({ id: doc._id, source: doc._source, now });
      const hash = idToHash.get(doc._id);
      if (decision !== undefined && hash !== undefined) {
        found.set(hash, [...(found.get(hash) ?? []), decision]);
      }
    }
  }
  return found;
};
