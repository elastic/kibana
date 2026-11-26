/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { TRIAGE_DECISIONS_AI_INDEX_DEST } from '../../../common/step_types/triage_decisions_index';
import {
  triageMatchFpDecisionsStepCommonDefinition,
  type MatchFpDecisionsStatus,
} from '../../../common/step_types/alert_triage';
import {
  DECISION_AUTO_CLOSE_SEVERITIES,
  DECISION_CAP_WINDOW_MS,
  DECISION_DAILY_CLOSE_CAP,
  DECISION_MATCH_TOTAL_BUDGET_MS,
  DECISION_MATCH_WORK_BUDGET_MS,
  DECISION_NOTES_PER_SWEEP,
  DECISION_SIGNER_TRUST_FIELDS,
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
  type MatchCandidate,
  type StoredDecision,
} from '../../alert_triage/fp_decisions';
import { buildPatternKeys, describePatternKey, getField } from '../../alert_triage/pattern_key';
import { tagInChunks } from '../../alert_triage/plan_sweep';
import {
  closeStillOpenAlertsAsFalsePositive,
  type DecisionCursor,
  countClosedByDecision,
  fetchDecisionCandidates,
  findAlertIdsWithTag,
  findAlertsNotClosedAsFalsePositive,
  findOpenAlertIds,
  statusCodeOf,
  tagAlerts,
  writeAlertNotes,
} from './ports';

export interface MatchFpDecisionsStepDependencies {
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
  /** The flag mode. A missing or mistyped value reads as `off`, so it cannot tag or close alerts. */
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

/**
 * The matched candidates whose matches `on` only tags, as shadow does:
 * - a cloud key. shortcut: it is the action plus the account, so one approval covers every actor of
 *   that action in the account; act on it once a guard limits the share of a rule one decision
 *   covers, sized from shadow data.
 * - a key that names a signer the alert does not mark as trusted. The key leaves out the file hash
 *   when a signer is named, so without trust a forged certificate with the same subject would match.
 * - a key with neither a signer nor a hash, such as a registry key or an alert whose source sends no
 *   hash. It names only paths, so any binary put at an approved path would match.
 */
const heldInShadowIds = (
  candidates: readonly MatchCandidate[],
  matched: ReadonlySet<string>
): Set<string> =>
  new Set(
    candidates
      .filter(({ id, doc }) => {
        if (!matched.has(id)) return false;
        const { strict } = buildPatternKeys(doc);
        if (strict === undefined) return false;
        const { kind, values } = describePatternKey(strict);
        if (kind === 'cloud') return true;
        const namesSigner = values.some(([field]) =>
          field.endsWith('.code_signature.subject_name')
        );
        if (!namesSigner) return !values.some(([field]) => field.endsWith('.hash.sha256'));
        const trustField = DECISION_SIGNER_TRUST_FIELDS[kind];
        // A signer of a kind with no known trust field is held too, so a new kind cannot skip the check.
        return trustField === undefined || getField(doc, trustField) !== true;
      })
      .map(({ id }) => id)
  );

/** Splits each decision's alerts into those `on` acts on and those it holds in shadow. */
const splitHeld = (byDecision: ReadonlyMap<string, string[]>, held: ReadonlySet<string>) => {
  const act = new Map<string, string[]>();
  const kept = new Map<string, string[]>();
  for (const [id, alertIds] of byDecision) {
    const actOn = alertIds.filter((alertId) => !held.has(alertId));
    const hold = alertIds.filter((alertId) => held.has(alertId));
    if (actOn.length > 0) act.set(id, actOn);
    if (hold.length > 0) kept.set(id, hold);
  }
  return { act, held: kept };
};

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
  held_in_shadow: 0,
  tag_failures: 0,
  notes_missing: 0,
  left_for_notes: 0,
  deferred: 0,
  out_of_time: false,
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
 * analysed nor proposed. Neither calls a model. A match on a `cloud` key, on a signer the alert
 * does not mark as trusted, or on a key with neither a signer nor a hash, is only tagged, as in
 * shadow, and counted in `held_in_shadow`.
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

        // The run's own space, never an input: it picks which space's decisions the hashes reach.
        const { spaceId } = contextManager.getContext().workflow;
        const now = Date.now();
        // After the work deadline no new decision is started and no new page is read: the rest waits
        // for the next sweep. After the total deadline no new note is started.
        const workDeadline = now + DECISION_MATCH_WORK_BUDGET_MS;
        const totalDeadline = now + DECISION_MATCH_TOTAL_BUDGET_MS;
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

        const outOfTime = () => {
          if (Date.now() <= workDeadline) return false;
          totals.out_of_time = true;
          return true;
        };

        /**
         * Notes say on each alert why it was closed or kept out of analysis, so an analyst reading
         * the alert does not have to look the decision up. They are queued here and written once
         * for the whole step, in one pool: the notes route takes one note per call, so a pool per
         * decision would leave most decisions waiting on one call each. A decision closes or skips
         * only as many alerts as the sweep has notes left for: the rest stay untagged and take the
         * normal path, so this sweep's planner may send them to analysis, and a later sweep matches
         * those it did not. They are counted in `left_for_notes`. A note that cannot be
         * written never undoes the close: it is counted in `notes_missing`.
         */
        const noteJobs: Array<{ alertId: string; note: string }> = [];
        const queueNotes = (id: string, alertIds: string[], action: 'closed' | 'skipped') => {
          const decision = decisionsById.get(id);
          const allowed = decision === undefined ? [] : alertIds.slice(0, notesLeft);
          notesLeft -= allowed.length;
          if (decision !== undefined) {
            const note = noteText(decision, action);
            allowed.forEach((alertId) => noteJobs.push({ alertId, note }));
          }
          totals.notes_missing += alertIds.length - allowed.length;
        };

        const warn = (what: string, error: unknown) =>
          logger.warn(`${what}: ${error instanceof Error ? error.message : error}`);

        /**
         * Whether the decision is still in force right now. The decisions were read before the
         * candidates were matched, so a revoke that lands in between would otherwise be undone by
         * the tags and closes that follow. A read that fails throws, so the caller acts on nothing.
         */
        const stillActive = async (id: string): Promise<boolean> => {
          try {
            const es = contextManager.getScopedEsClient();
            const { _source } = await es.get<Record<string, unknown>>({
              index: TRIAGE_DECISIONS_AI_INDEX_DEST.value,
              id,
            });
            return readActiveDecision({ id, source: _source, now: Date.now() }) !== undefined;
          } catch (error) {
            if (statusCodeOf(error) === 404) return false;
            throw error;
          }
        };

        /** Tags the alerts of each decision. A decision that cannot be tagged is counted and skipped. */
        const tag = async (prefix: string, byDecision: Map<string, string[]>) => {
          for (const [id, alertIds] of byDecision) {
            if (outOfTime()) {
              totals.deferred++;
              continue;
            }
            try {
              await tagInChunks(write, { alertIds, add: [`${prefix}${id}`], remove: [] });
            } catch (error) {
              totals.tag_failures++;
              warn(`Could not tag the alerts of decision ${id}`, error);
            }
          }
        };

        /**
         * Takes the decision's tag off the alerts a failed close left open. Candidates leave out
         * every alert with that tag, so a tag left on an open alert would stop the next sweep from
         * trying again. Alerts the close did reach keep it, so revoke can find them. Best effort:
         * when this fails too, the alerts stay with analysis.
         */
        const untagStillOpen = async (id: string, alertIds: string[]) => {
          if (alertIds.length === 0) return;
          try {
            const open = await findOpenAlertIds(contextManager, alertIds);
            if (open.length === 0) return;
            await tagInChunks(write, {
              alertIds: open,
              add: [],
              remove: [`${TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX}${id}`],
            });
          } catch (error) {
            warn(`Could not take the tag of decision ${id} off alerts that stayed open`, error);
          }
        };

        /**
         * Takes the decision's tag off the alerts the close left alone, because an analyst moved
         * them on after the search (acknowledged, or closed for another reason), and returns them.
         * Unlike `untagStillOpen`, a failure here throws, because the notes must not claim a close
         * that did not happen.
         */
        const releaseMovedOn = async (id: string, alertIds: string[]): Promise<string[]> => {
          const left = await findAlertsNotClosedAsFalsePositive(contextManager, alertIds);
          if (left.length > 0) {
            await tagInChunks(write, {
              alertIds: left,
              add: [],
              remove: [`${TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX}${id}`],
            });
          }
          return left;
        };

        /**
         * Closes what each decision may still close today. The decision's tag goes on first, so a
         * close that lands is always findable by revoke. A failure takes the tag off the alerts that
         * stayed open, so the next sweep tries them again. When the daily count cannot be read nothing is
         * closed, because the cap could not be applied.
         */
        const close = async (byDecision: Map<string, string[]>) => {
          for (const [id, alertIds] of byDecision) {
            if (outOfTime()) {
              totals.deferred++;
              continue;
            }
            let tagged: string[] = [];
            try {
              if (!(await stillActive(id))) {
                logger.info(
                  `Decision ${id} was revoked or expired during the sweep: it closes nothing`
                );
                continue;
              }
              if (!room.has(id)) {
                room.set(
                  id,
                  Math.max(
                    0,
                    DECISION_DAILY_CLOSE_CAP -
                      (await countClosedByDecision(
                        contextManager,
                        id,
                        now - DECISION_CAP_WINDOW_MS
                      ))
                  )
                );
              }
              const withinCap = alertIds.slice(0, room.get(id));
              totals.capped += alertIds.length - withinCap.length;
              const allowed = withinCap.slice(0, notesLeft);
              totals.left_for_notes += withinCap.length - allowed.length;
              if (allowed.length === 0) continue;
              tagged = allowed;
              await tagInChunks(write, {
                alertIds: allowed,
                add: [`${TRIAGE_CLOSED_BY_DECISION_TAG_PREFIX}${id}`],
                remove: [],
              });
              let timedOut = false;
              for (let from = 0; from < allowed.length; from += TAG_CHUNK_SIZE) {
                const closing = allowed.slice(from, from + TAG_CHUNK_SIZE);
                // The attempt counts against today's allowance before it is made: a close that
                // fails half way may have closed alerts, and the next page must not close another
                // full allowance of the same decision. A close that skipped alerts gives them back,
                // unless it timed out, because then it may have written more than it reports.
                room.set(id, (room.get(id) ?? 0) - closing.length);
                const { updated, timedOut: chunkTimedOut } =
                  await closeStillOpenAlertsAsFalsePositive(contextManager, closing);
                totals.closed += updated;
                if (chunkTimedOut) timedOut = true;
                else room.set(id, (room.get(id) ?? 0) + closing.length - updated);
                // The alerts a timed-out close did not reach are released like the ones an analyst
                // moved on, so the next sweep tries them again and only closed alerts get a note.
                const moved = updated < closing.length ? await releaseMovedOn(id, closing) : [];
                queueNotes(
                  id,
                  closing.filter((alertId) => !moved.includes(alertId)),
                  'closed'
                );
              }
              if (timedOut) {
                totals.close_failures++;
                logger.warn(`Closing the alerts of decision ${id} timed out part way`);
              }
            } catch (error) {
              totals.close_failures++;
              warn(`Could not close the alerts of decision ${id}`, error);
              await untagStillOpen(id, tagged);
            }
          }
        };

        const tagSkipped = async (byDecision: Map<string, string[]>) => {
          for (const [id, alertIds] of byDecision) {
            if (outOfTime()) {
              totals.deferred++;
              continue;
            }
            const allowed = alertIds.slice(0, notesLeft);
            totals.left_for_notes += alertIds.length - allowed.length;
            if (allowed.length === 0) continue;
            const skipTag = `${TRIAGE_SKIPPED_BY_DECISION_TAG_PREFIX}${id}`;
            const skipTags = [VERDICT_INCONCLUSIVE_TAG, skipTag];
            let skipping: string[] = [];
            try {
              if (!(await stillActive(id))) {
                logger.info(
                  `Decision ${id} was revoked or expired during the sweep: it skips nothing`
                );
                continue;
              }
              // Counted and noted per chunk: a later chunk that fails must not leave the alerts of
              // an earlier one out of analysis with no note and no charge on the note allowance.
              for (let from = 0; from < allowed.length; from += TAG_CHUNK_SIZE) {
                skipping = allowed.slice(from, from + TAG_CHUNK_SIZE);
                await write({ alertIds: skipping, add: skipTags, remove: [] });
                totals.skipped += skipping.length;
                queueNotes(id, skipping, 'skipped');
                skipping = [];
              }
            } catch (error) {
              totals.tag_failures++;
              warn(`Could not tag the alerts of decision ${id}`, error);
              // The failed chunk may be tagged in part. Only alerts that carry this decision's skip
              // tag lose the tags, so a verdict another writer gave in the meantime stays. They go
              // back to analysis, and the next sweep tries them again.
              if (skipping.length > 0) {
                try {
                  const tagged = await findAlertIdsWithTag(contextManager, skipping, skipTag);
                  if (tagged.length > 0)
                    await write({ alertIds: tagged, add: [], remove: skipTags });
                } catch (untagError) {
                  warn(`Could not take the tags of decision ${id} off a failed chunk`, untagError);
                }
              }
            }
          }
        };

        const count = (byDecision: Map<string, string[]>) =>
          [...byDecision.values()].reduce((sum, ids) => sum + ids.length, 0);

        // A read that fails on a later page must not discard what the earlier pages already did:
        // those alerts carry a decision tag and are left out of later searches, so their notes
        // and counts would never be retried.
        let pageFailed = false;
        try {
          let after: DecisionCursor | undefined;
          for (let page = 0; page < MAX_PAGES; page++) {
            if (outOfTime()) break;
            const found = await fetchDecisionCandidates(
              contextManager,
              input.analysis_tag_prefix,
              now - input.lookback_hours * HOUR_MS,
              filters,
              { after }
            );
            const hashes = hashCandidates(found.candidates, spaceId);
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
              // Only matched alerts can be held, so only their keys are built again.
              const held = heldInShadowIds(
                found.candidates,
                new Set([...matches.wouldClose.values(), ...matches.wouldSkip.values()].flat())
              );
              const skip = splitHeld(matches.wouldSkip, held);
              const closing = splitHeld(matches.wouldClose, held);
              // A dismissed pattern is a verdict of its own: `az:inconclusive` takes the alert out of
              // the sweep and keeps it from a proposal, and the decision tag says why. It goes first:
              // it is one cheap call per decision, and when time runs out the closes are what wait.
              await tagSkipped(skip.act);
              await close(closing.act);
              await tag(TRIAGE_WOULD_CLOSE_TAG_PREFIX, closing.held);
              await tag(TRIAGE_WOULD_SKIP_TAG_PREFIX, skip.held);
              totals.held_in_shadow += count(closing.held) + count(skip.held);
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
        } catch (error) {
          pageFailed = true;
          warn('Could not read a page of candidates or decisions', error);
        }

        totals.notes_missing += await writeAlertNotes(contextManager, noteJobs, {
          concurrency: NOTE_CONCURRENCY,
          deadline: totalDeadline,
        });

        return result(pageFailed ? 'failed' : 'ok', {
          ...totals,
          decisions_matched: decisionsSeen.size,
        });
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
  docs: Array<{
    _id: string;
    found?: boolean;
    _source?: Record<string, unknown>;
    error?: { type?: string; reason?: string };
  }>;
}

/**
 * Reads the decisions of the given key hashes by their ids: one read per hash and kind, no search,
 * so no field mapping is needed and expiry is checked here. A missing index means no decisions.
 * Any other document that could not be read throws: read as missing, an unread dismissal would let the
 * approval of the same key close alerts the dismissal protects.
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
        index: TRIAGE_DECISIONS_AI_INDEX_DEST.value,
        ids: ids.slice(from, from + MGET_CHUNK),
      })) as MgetResponse;
    } catch (error) {
      if (statusCodeOf(error) === 404) return found;
      throw error;
    }
    for (const doc of response.docs) {
      // Before the first decision is written the index does not exist. `_mget` then answers 200 with
      // this error on each document, which means no decisions, not a failed read.
      if (doc.error?.type === 'index_not_found_exception') continue;
      if (doc.error !== undefined) {
        throw new Error(
          `Decision ${doc._id} could not be read: ${doc.error.type ?? 'unknown'} ${
            doc.error.reason ?? ''
          }`.trim()
        );
      }
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
