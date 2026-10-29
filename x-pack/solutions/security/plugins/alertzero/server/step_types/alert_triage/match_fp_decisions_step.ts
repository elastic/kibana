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
  DECISION_DAILY_CLOSE_CAP,
  DECISION_NOTES_PER_SWEEP,
  NOTE_CONCURRENCY,
  VERDICT_INCONCLUSIVE_TAG,
  TAG_CHUNK_SIZE,
  TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX,
  TRIAGE_SKIPPED_BY_DECISION_TAG_PREFIX,
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
import {
  closeAlertsAsFalsePositive,
  countClosedByDecision,
  fetchDecisionCandidates,
  statusCodeOf,
  tagAlerts,
  writeAlertNotes,
} from './ports';

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
  closed: 0,
  skipped: 0,
  capped: 0,
  close_failures: 0,
  excluded_by_severity: 0,
  tag_failures: 0,
  notes_missing: 0,
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
 * In `on` it acts. An approved match is tagged `az:closed_by_decision:<decision>` and closed as a
 * false positive, up to the decision's daily cap; the rest wait for the normal path. A dismissed
 * match is tagged `az:inconclusive` and `az:skipped_by_decision:<decision>`, so it is neither
 * analysed nor proposed. Neither calls a model.
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
        const mode = await getMode();
        if (mode === 'off') return result('off');
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
        const totals = { ...NOTHING };
        const decisionsSeen = new Set<string>();
        // Alerts each decision may still close today. Read once per decision, then counted down.
        const room = new Map<string, number>();
        const decisionsById = new Map<string, StoredDecision>();
        let notesLeft = DECISION_NOTES_PER_SWEEP;

        /**
         * Says on each alert why it was closed or kept out of analysis, so an analyst reading the
         * alert does not have to look the decision up. A note that cannot be written never undoes
         * the close: it is counted in `notes_missing`.
         */
        const addNotes = async (id: string, alertIds: string[], action: 'closed' | 'skipped') => {
          const decision = decisionsById.get(id);
          const allowed = alertIds.slice(0, notesLeft);
          notesLeft -= allowed.length;
          const failed =
            decision === undefined || allowed.length === 0
              ? allowed
              : await writeAlertNotes(
                  contextManager,
                  allowed,
                  noteText(decision, action),
                  NOTE_CONCURRENCY
                );
          totals.notes_missing += alertIds.length - allowed.length + failed.length;
        };

        const warn = (what: string, error: unknown) =>
          logger.warn(`${what}: ${error instanceof Error ? error.message : error}`);

        /** Tags the alerts of each decision. A decision that cannot be tagged is counted and skipped. */
        const tag = async (prefix: string, byDecision: Map<string, string[]>) => {
          for (const [id, alertIds] of byDecision) {
            try {
              await tagInChunks(write, { alertIds, add: [`${prefix}${id}`], remove: [] });
            } catch (error) {
              totals.tag_failures++;
              warn(`Could not tag the alerts of decision ${id}`, error);
            }
          }
        };

        /**
         * Closes what each decision may still close today. The decision's tag goes on first, so a
         * close that lands is always findable by revoke; a close that fails leaves tagged open
         * alerts, which the next sweep tries again. When the daily count cannot be read nothing is
         * closed, because the cap could not be applied.
         */
        const close = async (byDecision: Map<string, string[]>) => {
          for (const [id, alertIds] of byDecision) {
            try {
              if (!room.has(id)) {
                room.set(
                  id,
                  Math.max(
                    0,
                    DECISION_DAILY_CLOSE_CAP -
                      (await countClosedByDecision(contextManager, id, now - 24 * HOUR_MS))
                  )
                );
              }
              const allowed = alertIds.slice(0, room.get(id));
              totals.capped += alertIds.length - allowed.length;
              if (allowed.length === 0) continue;
              await tagInChunks(write, {
                alertIds: allowed,
                add: [`${TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX}${id}`],
                remove: [],
              });
              for (let from = 0; from < allowed.length; from += TAG_CHUNK_SIZE) {
                const closing = allowed.slice(from, from + TAG_CHUNK_SIZE);
                await closeAlertsAsFalsePositive(contextManager, closing);
                totals.closed += closing.length;
                room.set(id, (room.get(id) ?? 0) - closing.length);
                await addNotes(id, closing, 'closed');
              }
            } catch (error) {
              totals.close_failures++;
              warn(`Could not close the alerts of decision ${id}`, error);
            }
          }
        };

        const tagSkipped = async (byDecision: Map<string, string[]>) => {
          for (const [id, alertIds] of byDecision) {
            try {
              await tagInChunks(write, {
                alertIds,
                add: [VERDICT_INCONCLUSIVE_TAG, `${TRIAGE_SKIPPED_BY_DECISION_TAG_PREFIX}${id}`],
                remove: [],
              });
              totals.skipped += alertIds.length;
              await addNotes(id, alertIds, 'skipped');
            } catch (error) {
              totals.tag_failures++;
              warn(`Could not tag the alerts of decision ${id}`, error);
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
            { after, includeTaggedByShadow: mode === 'on' }
          );
          const hashes = hashCandidates(found.candidates, input.space_id);
          const decisionsByHash = await readDecisions({
            mget: (params) => contextManager.getScopedEsClient().mget(params),
            hashes: new Set(hashes.values()),
            now,
          });
          for (const decisions of decisionsByHash.values()) {
            for (const decision of decisions) decisionsById.set(decision.id, decision);
          }
          const matches = matchDecisions({
            candidates: found.candidates,
            hashes,
            decisionsByHash,
            severities: DECISION_AUTO_CLOSE_SEVERITIES,
          });

          if (mode === 'on') {
            await close(matches.wouldClose);
            // A dismissed pattern is a verdict of its own: `az:inconclusive` takes the alert out of
            // the sweep and keeps it from a proposal, and the decision tag says why.
            await tagSkipped(matches.wouldSkip);
          } else {
            await tag(TRIAGE_WOULD_CLOSE_TAG_PREFIX, matches.wouldClose);
            await tag(TRIAGE_WOULD_SKIP_TAG_PREFIX, matches.wouldSkip);
          }

          totals.candidates += found.candidates.length;
          totals.would_close += count(matches.wouldClose);
          totals.would_skip += count(matches.wouldSkip);
          totals.excluded_by_severity += matches.excludedBySeverity;
          for (const id of [...matches.wouldClose.keys(), ...matches.wouldSkip.keys()]) {
            decisionsSeen.add(id);
          }
          after = found.after;
          if (after === undefined) break;
        }

        return result('ok', { ...totals, decisions_matched: decisionsSeen.size });
      } catch (error) {
        logger.warn(
          `Triage decisions were not matched: ${error instanceof Error ? error.message : error}`
        );
        return result('failed');
      }
    },
  });

const noteText = (decision: StoredDecision, action: 'closed' | 'skipped'): string => {
  const by = (verb: string) =>
    [
      decision.approver ? `${verb} by ${decision.approver}` : verb,
      decision.decidedAt ? `on ${decision.decidedAt.slice(0, 10)}` : '',
      decision.proposalId ? `(proposal ${decision.proposalId})` : '',
    ]
      .filter(Boolean)
      .join(' ');
  const what =
    action === 'closed'
      ? `**Closed by AlertZero** as a false positive, without analysis. It has exactly the pattern of decision \`${
          decision.id
        }\`, ${by('approved')}.`
      : `**Kept out of analysis by AlertZero.** It has exactly the pattern of a dismissed proposal (\`${
          decision.id
        }\`, ${by('dismissed')}), so it is marked inconclusive and no closure is proposed.`;
  return [
    what,
    '',
    `To take the decision back, run the workflow \`system-security-floor-alert-triage-revoke-decision\` with \`decision_id: ${decision.id}\`.`,
  ].join('\n');
};

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
