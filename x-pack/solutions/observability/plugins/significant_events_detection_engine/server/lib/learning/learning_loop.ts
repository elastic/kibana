/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ActivityEntry,
  EngineConfig,
  EngineEvent,
  LabelledIncident,
  LearningRunSummary,
  StrategyCandidate,
} from '../../../common';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../../../common';
import type { IEngineScope } from '../engine/engine_scope';
import { getErrorMessage } from '../errors';
import { acquireRunLease } from '../storage/run_lease';
import { learnedFingerprint } from '../strategies/learned_detectors';
import {
  advance,
  FINAL_STAGES,
  listCandidates,
  saveCandidate,
  SCOPE_HOLDING_STAGES,
} from './candidates';
import { judgeTrial, replayDetector, replayThreshold } from './evaluate_candidate';
import { listIncidents } from './incidents';
import { createMemory, type NewMemoryNote } from './memory';
import {
  proposeFromDecisionTrees,
  proposeFromDismissals,
  proposeFromMissedIncidents,
  proposeRetests,
  type ProposalContext,
} from './propose';
import { observeTopology, TOPOLOGY_REFRESH_MS } from './topology';
import { confirmedPaths } from './tree_paths';

/** Dismissals this recent feed tuning; older ones describe a system that may have changed. */
const DISMISSAL_WINDOW_MS = 7 * DAY_MS;
const MAX_DISMISSED_EVENTS = 500;
/** Verifier results this recent become memory notes. */
const VERIFIER_WINDOW_MS = DAY_MS;
const KNOWN_SERVICES_WINDOW_MS = DAY_MS;
/** A learning pass stops starting new work this close to its deadline. */
const DEADLINE_MARGIN_MS = 10_000;
/** A pass on its own, outside a tick, gets this long. */
const MANUAL_BUDGET_MS = 5 * MINUTE_MS;

/** Whether the last pass is old enough for the schedule to run another one. */
export async function learningDue(scope: IEngineScope, config: EngineConfig): Promise<boolean> {
  const last = await scope.storage.state.get('learning_run');
  return (
    !last ||
    Date.now() - Date.parse(last.started_at) >= config.learning.interval_minutes * MINUTE_MS
  );
}

/**
 * One pass of the learning loop. It runs after the detection runs it learns from, on its own
 * budget, and holds the space's run lease so it never overlaps one. It turns evidence into
 * memory, proposes candidates, and moves each candidate one step along the evolution path:
 * replay, trial, review, live, watch. Customer-owned objects are never changed here.
 */
export async function runLearning(
  scope: IEngineScope,
  {
    trigger,
    deadline = Date.now() + MANUAL_BUDGET_MS,
    signal = new AbortController().signal,
  }: { trigger: LearningRunSummary['trigger']; deadline?: number; signal?: AbortSignal }
): Promise<LearningRunSummary> {
  const startedAt = new Date().toISOString();
  const summary: LearningRunSummary = {
    run_id: `learning-${uuidv4()}`,
    trigger,
    started_at: startedAt,
    finished_at: startedAt,
    evidence: {
      incidents: 0,
      dismissed_events: 0,
      verifier_failures: 0,
      decision_trees: 0,
      investigation_pages: 0,
    },
    memory: { added: 0, retired: 0 },
    candidates: { proposed: 0, advanced: 0, failed: 0 },
    model_calls: 0,
    notes: [],
  };
  const lease = await acquireRunLease({
    state: scope.storage.state,
    trigger: trigger === 'schedule' ? 'schedule' : 'manual',
    durationMs: scope.limits.leaseDurationMs,
  });
  if (!lease.acquired) {
    return {
      ...summary,
      notes: ['A detection run holds the lease; learning waits for the next pass.'],
    };
  }
  const activity: ActivityEntry[] = [];
  const log = (entry: Omit<ActivityEntry, '@timestamp' | 'run_id' | 'step'>) =>
    activity.push({
      '@timestamp': new Date().toISOString(),
      run_id: summary.run_id,
      step: 'learning',
      ...entry,
    });
  try {
    await learn({ scope, summary, log, deadline, signal });
  } catch (error) {
    summary.error = getErrorMessage(error);
    scope.logger.warn(`Learning pass failed: ${summary.error}`);
    log({ action: 'failed', message: `The learning pass failed: ${summary.error}` });
  } finally {
    summary.finished_at = new Date().toISOString();
    log({
      action: 'pass_finished',
      message: `Learning pass: ${summary.memory.added} memory note(s), ${summary.candidates.proposed} candidate(s) proposed, ${summary.candidates.advanced} moved on, ${summary.candidates.failed} failed, ${summary.model_calls} model call(s).`,
      details: { evidence: summary.evidence, notes: summary.notes.slice(0, 20) },
    });
    await Promise.allSettled([
      scope.storage.state.put('learning_run', summary),
      scope.storage.records.appendActivity(activity),
    ]);
    await lease.held.release().catch(() => undefined);
  }
  return summary;
}

async function learn({
  scope,
  summary,
  log,
  deadline,
  signal,
}: {
  scope: IEngineScope;
  summary: LearningRunSummary;
  log: (entry: Omit<ActivityEntry, '@timestamp' | 'run_id' | 'step'>) => void;
  deadline: number;
  signal: AbortSignal;
}): Promise<void> {
  const { storage } = scope;
  const now = Date.now();
  const [
    config,
    candidates,
    incidents,
    sources,
    recentEvents,
    verifierEntries,
    trees,
    pages,
    activity,
  ] = await Promise.all([
    storage.getConfig(),
    listCandidates(storage.state),
    listIncidents(storage.state),
    scope.listSources(),
    storage.events.list({ statuses: ['inactive'], size: MAX_DISMISSED_EVENTS }),
    storage.records.listActivity({ step: 'verifier', size: 200 }),
    scope.investigations.decisionTrees(),
    scope.investigations.countPages(),
    storage.records.serviceActivity(new Date(now - KNOWN_SERVICES_WINDOW_MS).toISOString()),
  ]);
  const { autonomy } = config.learning;
  const dismissed = recentEvents.items.filter(
    (event) =>
      event.dismissal &&
      event.dismissal.reason !== 'duplicate' &&
      now - Date.parse(event.dismissal.at) < DISMISSAL_WINDOW_MS
  );
  const verifierFailures = verifierEntries.items.filter(
    (entry) =>
      entry.action === 'does_not_hold' &&
      entry.event_id &&
      now - Date.parse(entry['@timestamp']) < VERIFIER_WINDOW_MS
  );
  summary.evidence = {
    incidents: incidents.length,
    dismissed_events: dismissed.length,
    verifier_failures: verifierFailures.length,
    decision_trees: trees.length,
    investigation_pages: pages,
  };

  // 1. Memory: the Verifier's findings, which no person acted on, become notes too. Notes are
  // keyed by their text and evidence, so a finding seen on every pass is stored once.
  if (autonomy.memory !== 'off') {
    const notes = (
      await Promise.all(
        verifierFailures.map(async (entry): Promise<NewMemoryNote[]> => {
          const found = await storage.events.get(entry.event_id!);
          return (found?.event.members ?? []).map((member) => ({
            scope: 'series',
            key: member.fingerprint,
            kind: 'verifier',
            text: `After "${found!.event.title}" opened, its evidence did not hold when re-run: ${
              entry.message
            }`,
            evidence: `verifier on event ${entry.event_id} at ${entry['@timestamp']}`,
          }));
        })
      )
    ).flat();
    summary.memory.added += await createMemory(storage.state).add(notes);
  }

  // 2. Topology: who calls whom, from what services write. Join proposals read it next run.
  const topology = await storage.state.get('topology');
  if (!topology || now - Date.parse(topology.computed_at) >= TOPOLOGY_REFRESH_MS) {
    const observed = await observeTopology({
      scope,
      sources,
      services: activity.map((item) => item.service),
      previous: topology,
      signal,
    });
    summary.notes.push(...observed.notes);
    await storage.state.put('topology', observed.topology);
    const added = observed.topology.edges.filter(
      (edge) =>
        !topology?.edges.some((old) => old.source === edge.source && old.target === edge.target)
    );
    log({
      action: 'topology_observed',
      message: `Observed ${observed.topology.edges.length} dependencies in the last hour of logs${
        added.length > 0
          ? `, ${added.length} new: ${added
              .map((edge) => `${edge.source} -> ${edge.target}`)
              .join(', ')}`
          : ''
      }. Join proposals use them from the next run.`,
      details: { edges: observed.topology.edges },
    });
  }

  // 3. Candidates: new ones from investigations, missed incidents and dismissals.
  const context: ProposalContext = {
    scope,
    config,
    sources,
    knownServices: activity.map((item) => item.service),
    incidents,
    knownSignatures: new Set(candidates.map((candidate) => candidate.signature)),
    modelBudget: { remaining: config.learning.max_model_calls_per_pass, used: 0 },
    signal,
    notes: summary.notes,
  };
  const proposed: StrategyCandidate[] = [];
  if (autonomy.detectors !== 'off') {
    const paths = confirmedPaths(trees);
    proposed.push(...(await proposeFromDecisionTrees(context, paths)));
    const covered = new Set(
      candidates.flatMap((candidate) =>
        candidate.origin.kind === 'missed_incident' ? [candidate.origin.incident_id] : []
      )
    );
    proposed.push(
      ...(await proposeFromMissedIncidents(
        context,
        incidents.filter(
          (incident) => incident.label === 'missed' && !covered.has(incident.incident_id)
        )
      ))
    );
  }
  if (autonomy.tuning !== 'off') {
    proposed.push(...(await proposeFromDismissals(context, dismissed)));
  }
  proposed.push(
    ...proposeRetests(
      context,
      candidates.filter((candidate) =>
        candidate.kind === 'detector' ? autonomy.detectors !== 'off' : autonomy.tuning !== 'off'
      )
    )
  );
  summary.model_calls = context.modelBudget.used;
  summary.candidates.proposed = proposed.length;
  await Promise.all(proposed.map((candidate) => saveCandidate(storage.state, candidate)));
  proposed.forEach((candidate) =>
    log({
      action: 'candidate_proposed',
      strategy: candidate.scope.strategy,
      service: candidate.scope.service,
      message: `Proposed "${candidate.title}" (${candidate.kind}, from ${candidate.origin.kind}). ${candidate.hypothesis}`,
      details: {
        candidate_id: candidate.candidate_id,
        detector: candidate.detector,
        threshold: candidate.threshold,
      },
    })
  );

  // 4. Evolution: every open candidate moves at most one step per pass.
  const all = [...proposed, ...candidates];
  for (const candidate of all.filter(
    (item) => !FINAL_STAGES.includes(item.stage) && item.stage !== 'kept'
  )) {
    // Sequential: a step can take a scope another candidate is waiting for.
    if (Date.now() > deadline - DEADLINE_MARGIN_MS || signal.aborted) {
      summary.notes.push('The pass used its time budget; the remaining candidates move next pass.');
      break;
    }
    const next = await step({ scope, config, candidate, all, incidents, signal });
    if (next === candidate) {
      continue;
    }
    const index = all.findIndex((item) => item.candidate_id === candidate.candidate_id);
    all[index] = next;
    await saveCandidate(storage.state, next);
    summary.candidates.advanced += 1;
    if (FINAL_STAGES.includes(next.stage)) {
      summary.candidates.failed += 1;
    }
    const last = next.history[next.history.length - 1];
    log({
      action: `candidate_${next.stage}`,
      strategy: next.scope.strategy,
      service: next.scope.service,
      message: `"${next.title}": ${candidate.stage} -> ${next.stage}. ${last.note}`,
      details: { candidate_id: next.candidate_id, replay: next.replay, trial: next.trial },
    });
  }
}

/** One step of one candidate along the evolution path, or the candidate unchanged. */
async function step({
  scope,
  config,
  candidate,
  all,
  incidents,
  signal,
}: {
  scope: IEngineScope;
  config: EngineConfig;
  candidate: StrategyCandidate;
  all: StrategyCandidate[];
  incidents: LabelledIncident[];
  signal: AbortSignal;
}): Promise<StrategyCandidate> {
  const now = Date.now();
  const capability = candidate.kind === 'detector' ? 'detectors' : 'tuning';
  const autonomy = config.learning.autonomy[capability];
  const { acceptance } = candidate;

  switch (candidate.stage) {
    case 'proposed': {
      if (!candidate.replay) {
        const replay =
          candidate.kind === 'detector'
            ? await replayDetector({ scope, config, candidate, incidents, signal })
            : await replayThreshold({ scope, config, candidate, incidents });
        const replayed = { ...candidate, replay };
        if (!replay.passed) {
          return advance(
            replayed,
            'replay_failed',
            `Replay ${replay.from} - ${replay.to} failed the bar: ${replay.reasons.join('; ')}${
              replay.error ? ` (${replay.error})` : ''
            }. Kept so it is not proposed again.`
          );
        }
        return startOrWait(replayed, all, config, autonomy, 'Replay passed');
      }
      return startOrWait(candidate, all, config, autonomy, 'Its scope is free now');
    }
    case 'trial': {
      const startedAt = Date.parse(candidate.trial!.started_at);
      if (now - startedAt < acceptance.min_trial_minutes * MINUTE_MS) {
        return candidate;
      }
      const trial = await judgeTrial({
        scope,
        candidate,
        incidents,
        quietPeriodBuckets: config.quiet_period_buckets,
      });
      const judged = { ...candidate, trial };
      if (!trial.passed) {
        return advance(
          judged,
          'rolled_back',
          `Trial of ${Math.round((now - startedAt) / MINUTE_MS)} min failed: ${trial.reasons.join(
            '; '
          )}. Kept so it is not proposed again.`
        );
      }
      const result = `Trial of ${Math.round((now - startedAt) / MINUTE_MS)} min passed: ${
        trial.would_open
      } would-be event(s), ${trial.caught.length} on labelled incidents, ${
        trial.false_opens
      } false.`;
      return autonomy === 'act'
        ? goLive(judged, `${result} Autonomy is "act", so it goes live with its daily cap.`)
        : advance(judged, 'review', `${result} Waiting for a person to approve it.`);
    }
    case 'live': {
      const since = Date.parse(candidate.live!.since);
      const watch = await watchLive({ scope, candidate, incidents });
      const { missedSince, ...counts } = watch;
      const watched = { ...candidate, live: { ...candidate.live!, ...counts } };
      if (watch.dismissed >= acceptance.rollback_dismissals || missedSince > 0) {
        return advance(
          watched,
          'rolled_back',
          missedSince > 0
            ? `Rolled back by itself: ${missedSince} incident(s) on ${candidate.scope.service} were reported missed while it was live.`
            : `Rolled back by itself: ${watch.dismissed} of its events were dismissed, at the bar of ${acceptance.rollback_dismissals}.`
        );
      }
      if (now - since >= acceptance.watch_minutes * MINUTE_MS) {
        return advance(
          watched,
          'kept',
          `Watched for ${Math.round((now - since) / HOUR_MS)} h with ${
            watch.events_opened
          } event(s), ${watch.dismissed} dismissed: kept.`
        );
      }
      return watch.events_opened !== candidate.live!.events_opened ||
        watch.dismissed !== candidate.live!.dismissed
        ? { ...watched, updated_at: new Date().toISOString() }
        : candidate;
    }
    default:
      // `review` waits for a person; final stages never move.
      return candidate;
  }
}

/** Starts the trial (or, for a threshold, review or live) when no other change holds the scope. */
function startOrWait(
  candidate: StrategyCandidate,
  all: StrategyCandidate[],
  config: EngineConfig,
  autonomy: EngineConfig['learning']['autonomy']['detectors'],
  why: string
): StrategyCandidate {
  const busy = all.find(
    (other) =>
      other.candidate_id !== candidate.candidate_id &&
      SCOPE_HOLDING_STAGES.includes(other.stage) &&
      other.scope.service === candidate.scope.service &&
      other.scope.source_id === candidate.scope.source_id
  );
  if (busy) {
    const note = `${why}; waiting: "${busy.title}" is ${busy.stage} on ${candidate.scope.service}, one change at a time.`;
    const last = candidate.history[candidate.history.length - 1];
    // An unchanged wait is not worth a write or a log line every pass.
    return last.note === note ? candidate : advance(candidate, 'proposed', note);
  }
  const replay = candidate.replay!;
  const result = `${why}: ${replay.would_open} would-be event(s) over ${Math.round(
    (Date.parse(replay.to) - Date.parse(replay.from)) / HOUR_MS
  )} h, ${replay.caught.length} kept incident(s) caught, ${
    replay.false_opens_per_day
  } false per day.`;
  if (candidate.kind === 'detector') {
    return {
      ...advance(
        candidate,
        'trial',
        `${result} It runs as a trial for ${config.learning.acceptance.min_trial_minutes} min and raises nothing.`
      ),
      trial: {
        started_at: new Date().toISOString(),
        would_raise: 0,
        would_open: 0,
        caught: [],
        false_opens: 0,
        reasons: [],
      },
    };
  }
  // A threshold has no trial of its own: the replay on stored evaluations is its trial.
  return autonomy === 'act'
    ? goLive(candidate, `${result} Autonomy is "act", so it applies now.`)
    : advance(candidate, 'review', `${result} Waiting for a person to approve it.`);
}

export function goLive(
  candidate: StrategyCandidate,
  note: string,
  by: 'engine' | 'person' = 'engine'
): StrategyCandidate {
  return {
    ...advance(candidate, 'live', note, by),
    live: { since: new Date().toISOString(), events_opened: 0, dismissed: 0, verifier_failures: 0 },
  };
}

/** What happened while a change was live: its events, dismissals, and missed reports. */
async function watchLive({
  scope,
  candidate,
  incidents,
}: {
  scope: IEngineScope;
  candidate: StrategyCandidate;
  incidents: LabelledIncident[];
}): Promise<{
  events_opened: number;
  dismissed: number;
  verifier_failures: number;
  missedSince: number;
}> {
  const since = candidate.live!.since;
  const fingerprints =
    candidate.kind === 'detector'
      ? [learnedFingerprint(candidate.detector!.detector_id)]
      : candidate.threshold!.fingerprints;
  const events = (await scope.storage.events.findByFingerprints(fingerprints))
    .map(({ event }) => event)
    .filter(
      (event: EngineEvent) =>
        (event.open_windows[event.open_windows.length - 1]?.raised_at ?? event.created_at) >= since
    );
  const missedSince = incidents.filter(
    (incident) =>
      incident.label === 'missed' &&
      incident.created_at >= since &&
      incident.services.includes(candidate.scope.service) &&
      // A threshold change that hid a real problem rolls back; a detector cannot hide one.
      candidate.kind === 'threshold'
  ).length;
  return {
    events_opened: events.length,
    dismissed: events.filter((event) => event.dismissal && event.dismissal.reason !== 'duplicate')
      .length,
    verifier_failures: events.filter((event) => event.verification && !event.verification.holds)
      .length,
    missedSince,
  };
}
