/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  BaselineDecision,
  DetectionStrategyId,
  EngineConfig,
  EngineProgress,
  EngineRunSummary,
} from '../../../common';
import { BUCKET_MS, HOUR_MS } from '../../../common';
import type { TaggedObservation } from '../domain';
import { getErrorMessage } from '../errors';
import { RunAbortedError } from '../run_aborted_error';
import { checkBaseline, fillSparseHistory } from '../pipeline/baseline';
import { recordRunCost } from '../cost/record_cost';
import { EMPTY_RULES_RECORD, ensureRules } from '../rules/ensure_rules';
import type { HistorySample } from '../storage/records_store';
import { acquireRunLease } from '../storage/run_lease';
import { STRATEGIES } from '../strategies/strategy_registry';
import { createAgentRunner } from './agent_runner';
import { createDiscoveryStep, type FiringAlert } from './discovery_step';
import type { IEngineScope } from './engine_scope';
import { evaluateStrategies } from './evaluate_strategies';
import { createEventWorkingSet } from './event_working_set';
import { createRunKnowledge } from './knowledge';
import { applyLifecycle } from './lifecycle_step';
import { persistAndPublish } from './persist_step';
import { planWindows, type StrategyWindow } from './plan_windows';
import { createRunRecorder, type IRunRecorder } from './run_recorder';
import { verifyRecentEvents } from './verifier_step';

/** The baseline reads at least this far back, so a long incident still leaves normal samples. */
const HISTORY_LOOKBACK_MS = 6 * HOUR_MS;
/** Most open events one run loads; past it the oldest stop receiving updates, and it is logged. */
const MAX_OPEN_EVENTS = 5_000;
/** Recently closed events loaded so the verifier can re-check a fresh close. */
const RECENTLY_CLOSED_EVENTS = 50;
/** A detection that waited this long for budget describes a moment that has passed. */
const MAX_PENDING_AGE_MS = HOUR_MS;

export const EMPTY_PROGRESS: EngineProgress = { watermarks: {}, consecutive_failures: 0 };

function startOfUtcDay(timestamp: number): string {
  const day = new Date(timestamp);
  day.setUTCHours(0, 0, 0, 0);
  return day.toISOString();
}

const byImportance = (a: TaggedObservation, b: TaggedObservation) => b.importance - a.importance;

/** The options of one run. */
export interface RunEngineOptions {
  trigger: EngineRunSummary['trigger'];
  /** Backtests evaluate the bucket ending before this time instead of the settled ones. */
  now?: number;
  /** Aborts the run, such as when the HTTP request that started it goes away. */
  signal?: AbortSignal;
}

/**
 * One engine run in one space. It takes the space's lease, evaluates every strategy over the
 * minutes that settled since it last ran, and walks those minutes in order: baseline check,
 * identity, joins and the agent for each detection, then status for every open event. It stops
 * starting new minutes when its time budget runs out, and saves how far each strategy got, so
 * the next run continues exactly there.
 */
export async function runEngine(
  scope: IEngineScope,
  { trigger, now, signal }: RunEngineOptions
): Promise<EngineRunSummary> {
  const { storage, limits } = scope;
  const startedAt = Date.now();
  const startedIso = new Date(startedAt).toISOString();
  const recorder = createRunRecorder({ runId: uuidv4(), trigger, startedAt: startedIso });

  const lease = await acquireRunLease({
    state: storage.state,
    trigger,
    durationMs: limits.leaseDurationMs,
  });
  if (!lease.acquired) {
    return {
      ...recorder.summary,
      skip_reason: 'busy',
      skipped: `Another run (${lease.holder.trigger}, started ${lease.holder.acquired_at}) is still working in this space.`,
    };
  }

  const abort = new AbortController();
  const onAbort = () => abort.abort(new RunAbortedError('The request that started the run ended'));
  signal?.addEventListener('abort', onAbort, { once: true });
  const progress = (await storage.state.get('progress')) ?? EMPTY_PROGRESS;

  try {
    const summary = await executeRun({
      scope,
      recorder,
      trigger,
      now,
      progress,
      deadline: startedAt + limits.timeBudgetMs,
      signal: abort.signal,
    });
    return summary;
  } catch (error) {
    const message = getErrorMessage(error);
    const failed: EngineRunSummary = {
      ...recorder.summary,
      finished_at: new Date().toISOString(),
      error: message,
    };
    scope.logger.error(`Detection engine run failed: ${message}`);
    // Best effort: the failure itself must reach the page, but a second failure must not hide
    // the first.
    await Promise.allSettled([
      storage.state.put('progress', {
        ...progress,
        last_run_at: failed.finished_at,
        consecutive_failures: progress.consecutive_failures + 1,
        last_error: message,
      }),
      storage.state.put('last_run', failed),
      storage.records.writeRun(failed),
      storage.records.appendActivity([
        ...recorder.activity(),
        {
          '@timestamp': failed.finished_at,
          run_id: recorder.runId,
          step: 'run',
          action: 'failed',
          message: `The run failed: ${message}`,
        },
      ]),
    ]);
    throw error;
  } finally {
    signal?.removeEventListener('abort', onAbort);
    await lease.held.release().catch((error) => {
      // An unreleased lease only delays the next run until it expires.
      scope.logger.warn(`Could not release the run lease: ${getErrorMessage(error)}`);
    });
  }
}

async function executeRun({
  scope,
  recorder,
  trigger,
  now,
  progress,
  deadline,
  signal,
}: {
  scope: IEngineScope;
  recorder: IRunRecorder;
  trigger: EngineRunSummary['trigger'];
  now?: number;
  progress: EngineProgress;
  deadline: number;
  signal: AbortSignal;
}): Promise<EngineRunSummary> {
  const { storage, limits } = scope;
  const { summary } = recorder;
  const [config, storedRules, storedPending, sources] = await Promise.all([
    storage.getConfig(),
    storage.state.get('rules'),
    storage.state.get('pending'),
    scope.listSources(),
  ]);

  // Read once per run: rule reconciliation and the KI strategy share the same KI list.
  const knowledge = createRunKnowledge({ scope, sources });
  const rules =
    trigger === 'backtest'
      ? storedRules ?? EMPTY_RULES_RECORD
      : await ensureRules({
          scope,
          config,
          sources,
          getQueryLinks: knowledge.getQueryLinks,
          current: storedRules,
          signal,
          log: recorder.log,
        });

  const evaluationNow = now ?? Date.now();
  const windows = planWindows({
    now: evaluationNow,
    config,
    progress,
    limits,
    only:
      trigger === 'backtest'
        ? { bucketEnd: Math.floor(evaluationNow / BUCKET_MS) * BUCKET_MS }
        : undefined,
  });
  const pending = (storedPending?.detections ?? []).filter(
    (item) => Date.now() - Date.parse(item.queued_at) < MAX_PENDING_AGE_MS
  );

  if (windows.length === 0 && pending.length === 0) {
    const finishedAt = new Date().toISOString();
    const idle: EngineRunSummary = {
      ...summary,
      finished_at: finishedAt,
      skip_reason: 'nothing_settled',
      skipped: 'No new minute has settled for any strategy since the last run.',
    };
    await storage.state.put('progress', {
      ...progress,
      last_run_at: finishedAt,
      last_success_at: finishedAt,
      consecutive_failures: 0,
      last_error: undefined,
    });
    return idle;
  }

  // 1. Strategies report what they evaluated, in the common format.
  const evaluation = await evaluateStrategies({
    scope,
    config,
    windows,
    sources,
    ownedRules: rules.owned,
    getQueryLinks: knowledge.getQueryLinks,
    recorder,
    signal,
    backtest: trigger === 'backtest',
    now: evaluationNow,
  });
  summary.strategies = evaluation.summaries;
  await storage.records.writeObservations(
    evaluation.observations.map((observation) => ({
      run_id: recorder.runId,
      strategy: observation.strategy,
      fingerprint: observation.fingerprint,
      service: observation.service,
      bucket_start: new Date(observation.bucket_start).toISOString(),
      value: observation.value,
      looks_off: observation.looks_off,
      mode: 'live',
    }))
  );

  const visible = evaluation.observations.filter((observation) => !observation.internal);
  const firing = visible.filter((observation) => observation.looks_off);

  // 2. What discovery needs: open events, events owning a firing series, recent closes.
  const [open, owners, recent, dependencies, createdToday, ledger] = await Promise.all([
    storage.events.listOpen(MAX_OPEN_EVENTS),
    storage.events.findByFingerprints([
      ...firing.map((observation) => observation.fingerprint),
      ...pending.map((item) => item.observation.fingerprint),
    ]),
    storage.events.listRecent({ statuses: ['inactive'], size: RECENTLY_CLOSED_EVENTS }),
    knowledge.getDependencies(),
    storage.events.countCreatedSince(startOfUtcDay(evaluationNow)),
    storage.state.get('cost'),
  ]);
  if (open.truncated) {
    recorder.log({
      step: 'run',
      action: 'open_events_truncated',
      message: `More than ${MAX_OPEN_EVENTS} events are open; only the most recently updated get status changes this run.`,
    });
  }
  const events = createEventWorkingSet([...open.events, ...owners, ...recent]);

  const today = new Date(evaluationNow).toISOString().slice(0, 10);
  const agent = createAgentRunner({
    agent: scope.createAgent(config),
    config,
    modelCallsToday: ledger?.by_day[today]?.calls ?? 0,
    recorder,
    deadline,
    agentTimeoutMs: limits.agentTimeoutMs,
    signal,
  });
  const memoryCache = new Map<string, string[]>();
  const memoryFor = async (fingerprints: string[]): Promise<string[]> => {
    const missing = fingerprints.filter((fingerprint) => !memoryCache.has(fingerprint));
    if (missing.length > 0) {
      const found = await storage.state.getMany('memory', missing);
      missing.forEach((fingerprint) =>
        memoryCache.set(fingerprint, found.get(fingerprint)?.notes ?? [])
      );
    }
    return fingerprints.flatMap((fingerprint) => memoryCache.get(fingerprint) ?? []);
  };
  const discovery = createDiscoveryStep({
    scope,
    config,
    recorder,
    events,
    dependencies,
    agent,
    openedToday: new Map(Object.entries(createdToday)) as Map<DetectionStrategyId, number>,
    memoryFor,
    signal,
    maxPending: limits.maxPendingDetections,
    maxDetections: limits.maxDetectionsPerRun,
  });

  // 3. Detections that waited for budget go first: they are the oldest.
  for (const item of pending) {
    // Sequential: each decision can open an event the next detection joins.
    await discovery.process({
      observation: item.observation,
      baseline: item.baseline,
      firingAlerts: [],
      fromPending: item,
    });
  }

  // 4. Minute by minute, oldest first: the baseline check, discovery, then status.
  // With only waiting detections to retry there is no window; nothing older than now is read.
  const earliest =
    windows.length > 0
      ? Math.min(...windows.map((window) => window.from))
      : Math.floor(evaluationNow / BUCKET_MS) * BUCKET_MS;
  const history = await readBaselineHistory({ scope, config, firing, events, before: earliest });
  // Internal series too: a sparse series reads its heartbeat from the same run.
  const runSeries = groupByFingerprint(evaluation.observations);
  // Every evaluated minute, even one with no observations: lifecycle still runs for it.
  const buckets = [
    ...new Set([
      ...visible.map((observation) => observation.bucket_start),
      ...evaluation.evaluated.flatMap((window) => bucketsOf(window)),
    ]),
  ].sort((a, b) => a - b);

  let processedUpTo = earliest;
  for (const bucketStart of buckets) {
    // Sequential by design: a minute's events and statuses are the next minute's input.
    if (Date.now() >= deadline) {
      summary.budget_exhausted = true;
      recorder.log({
        step: 'run',
        action: 'time_budget',
        message: `The run used its time budget; it continues from ${new Date(
          bucketStart
        ).toISOString()} on the next run.`,
      });
      break;
    }
    if (signal.aborted) {
      throw signal.reason ?? new RunAbortedError('The run was aborted');
    }
    await processBucket({
      bucketStart,
      config,
      visible,
      evaluated: evaluation.evaluated,
      history,
      runSeries,
      events,
      discovery,
      recorder,
    });
    processedUpTo = bucketStart + BUCKET_MS;
  }

  // 5. The verifier re-checks recent openings and closings; cooldown is what remains.
  await verifyRecentEvents({
    dataEsClient: scope.dataEsClient,
    events,
    latestObservations: latestPerFingerprint(visible),
    before: earliest,
    recorder,
    signal,
  });
  // Cooldown: an event whose problem continued, with nothing new, gets no agent call.
  const continued = new Set(
    recorder
      .detections()
      .filter((detection) => detection.outcome === 'continued' && detection.event_id)
      .map((detection) => detection.event_id!)
  );
  events
    .dirty()
    .filter(({ event, change }) => change === 'facts' && continued.has(event.event_id))
    .forEach(({ event }) => {
      summary.agent.cooldown_skips += 1;
      recorder.log({
        step: 'agent',
        action: 'cooldown',
        event_id: event.event_id,
        message:
          'Nothing new joined and the problem did not return; facts updated, agent not called.',
      });
    });

  // 6. Persist and hand off.
  const conflicted = await persistAndPublish({ scope, config, events, recorder });
  await storage.records.writeDetections(
    recorder.detections().map((detection) =>
      detection.event_id && conflicted.has(detection.event_id)
        ? {
            ...detection,
            outcome: 'conflict' as const,
            outcome_reason: `${detection.outcome_reason} Not applied: the event changed while the run worked on it; the next run re-evaluates.`,
          }
        : detection
    )
  );

  const cost = await recordRunCost({
    usages: agent.usage(),
    ledger,
    inferenceClient: scope.inferenceClient,
    getPrices: scope.getPrices,
    defaultConnectorId: config.agent.connector_id,
    now: new Date().toISOString(),
  });
  if (cost) {
    await storage.state.put('cost', cost.ledger);
    summary.agent.tokens = cost.tokens;
    summary.agent.cost_usd = cost.costUsd;
    summary.agent.model = cost.model;
    recorder.log({
      step: 'agent',
      action: 'cost',
      message:
        cost.costUsd === null
          ? `The agent used ${cost.tokens} tokens on a model with no list price; not added to the cost.`
          : `The agent used ${cost.tokens} tokens: $${cost.costUsd.toFixed(
              4
            )} at Elastic Inference Service list price. Total so far: $${cost.ledger.total_usd.toFixed(
              4
            )}.`,
    });
  }

  const finishedAt = new Date().toISOString();
  summary.finished_at = finishedAt;
  summary.open_events = events.open().length;
  summary.bucket_start = new Date(earliest).toISOString();
  summary.bucket_end = new Date(processedUpTo).toISOString();
  const watermarks = advanceWatermarks({
    progress,
    evaluated: evaluation.evaluated,
    processedUpTo,
    budgetExhausted: summary.budget_exhausted === true,
  });
  summary.strategies = summary.strategies.map((strategySummary) => ({
    ...strategySummary,
    watermark: watermarks[strategySummary.strategy] ?? strategySummary.watermark,
  }));

  recorder.log({
    step: 'run',
    action: 'finished',
    message: `Run over ${summary.bucket_start} - ${summary.bucket_end}: ${
      summary.detections
    } detections, ${summary.agent.calls} agent call(s), ${
      summary.transitions.length
    } status change(s), ${summary.open_events} open event(s)${
      summary.conflicts ? `, ${summary.conflicts} conflict(s)` : ''
    }.`,
  });

  await Promise.all([
    storage.records.appendActivity(recorder.activity()),
    storage.records.writeRun(summary),
    storage.state.put('pending', { detections: discovery.pending() }),
    storage.state.put('last_run', summary),
    storage.state.put('progress', {
      watermarks,
      last_run_at: finishedAt,
      last_success_at: finishedAt,
      consecutive_failures: 0,
    }),
  ]);
  return summary;
}

function bucketsOf(window: StrategyWindow): number[] {
  const count = Math.max(0, Math.floor((window.to - window.from) / BUCKET_MS));
  return Array.from({ length: count }, (_, index) => window.from + index * BUCKET_MS);
}

function groupByFingerprint(observations: TaggedObservation[]): Map<string, TaggedObservation[]> {
  return observations.reduce((groups, observation) => {
    const series = groups.get(observation.fingerprint) ?? [];
    series.push(observation);
    groups.set(observation.fingerprint, series);
    return groups;
  }, new Map<string, TaggedObservation[]>());
}

function latestPerFingerprint(observations: TaggedObservation[]): Map<string, TaggedObservation> {
  return observations.reduce((latest, observation) => {
    const existing = latest.get(observation.fingerprint);
    if (!existing || existing.bucket_start < observation.bucket_start) {
      latest.set(observation.fingerprint, observation);
    }
    return latest;
  }, new Map<string, TaggedObservation>());
}

/**
 * History of every firing series before the run's first minute, leaving out the windows its
 * event was open. Later minutes of the run add the run's own earlier evaluations on top.
 */
async function readBaselineHistory({
  scope,
  config,
  firing,
  events,
  before,
}: {
  scope: IEngineScope;
  config: EngineConfig;
  firing: TaggedObservation[];
  events: ReturnType<typeof createEventWorkingSet>;
  before: number;
}): Promise<Map<string, HistorySample[]>> {
  const ownHistory = firing.filter(
    (observation) => STRATEGIES[observation.strategy].descriptor.baselinePolicy === 'own_history'
  );
  const heartbeats = [
    ...new Set(
      ownHistory.flatMap((observation) => (observation.heartbeat ? [observation.heartbeat] : []))
    ),
  ];
  const series = [
    ...[...new Set(ownHistory.map((observation) => observation.fingerprint))].map(
      (fingerprint) => ({
        fingerprint,
        exclude: events.ownerOf(fingerprint)?.open_windows ?? [],
      })
    ),
    // Heartbeats are read whole; the series' own open windows are left out after filling.
    ...heartbeats.map((fingerprint) => ({ fingerprint, exclude: [] })),
  ];
  return scope.storage.records.readHistory({
    series,
    before,
    lookbackMs: Math.max(config.baseline.history_buckets * BUCKET_MS, HISTORY_LOOKBACK_MS),
    limit: config.baseline.history_buckets,
  });
}

async function processBucket({
  bucketStart,
  config,
  visible,
  evaluated,
  history,
  runSeries,
  events,
  discovery,
  recorder,
}: {
  bucketStart: number;
  config: EngineConfig;
  visible: TaggedObservation[];
  evaluated: StrategyWindow[];
  history: Map<string, HistorySample[]>;
  runSeries: Map<string, TaggedObservation[]>;
  events: ReturnType<typeof createEventWorkingSet>;
  discovery: ReturnType<typeof createDiscoveryStep>;
  recorder: IRunRecorder;
}): Promise<void> {
  const inBucket = visible.filter((observation) => observation.bucket_start === bucketStart);
  const firing = inBucket.filter((observation) => observation.looks_off).sort(byImportance);
  const firingAlerts: FiringAlert[] = firing
    .filter((observation) => observation.strategy === 'customer_alerts')
    .map((observation) => ({ title: observation.title, service: observation.service }));
  const gates = new Map<string, BaselineDecision>();

  for (const observation of firing) {
    // Sequential: each decision can open an event the next detection may join.
    const { descriptor } = STRATEGIES[observation.strategy];
    const owner = events.ownerOf(observation.fingerprint);
    const pastOf = (fingerprint: string) => [
      ...(history.get(fingerprint) ?? []),
      ...(runSeries.get(fingerprint) ?? [])
        .filter((item) => item.bucket_start < bucketStart)
        .map((item) => ({
          bucket_start: new Date(item.bucket_start).toISOString(),
          value: item.value,
        })),
    ];
    const own = pastOf(observation.fingerprint);
    const baseline = checkBaseline({
      value: observation.value,
      unit: observation.unit,
      policy: descriptor.baselinePolicy,
      history: observation.heartbeat
        ? fillSparseHistory({ samples: own, heartbeat: pastOf(observation.heartbeat) })
        : own,
      excludeWindows: owner?.open_windows ?? [],
      settings: config.baseline,
    });
    recorder.countBaseline(baseline.decision);
    gates.set(observation.fingerprint, baseline.decision);
    if (baseline.decision === 'background' || baseline.decision === 'warming_up') {
      discovery.recordBelowNormal({ observation, baseline });
    } else {
      await discovery.process({ observation, baseline, firingAlerts });
    }
  }

  applyLifecycle({
    bucketStart,
    config,
    events,
    evaluatedStrategies: new Set(
      evaluated
        .filter((window) => bucketStart >= window.from && bucketStart < window.to)
        .map((window) => window.strategy)
    ),
    observations: new Map(inBucket.map((observation) => [observation.fingerprint, observation])),
    gates,
    recorder,
  });
}

/**
 * Where each strategy got to. A strategy that evaluated its whole window moves to its end; when
 * the run stopped early, it moves only as far as the minutes actually processed.
 */
function advanceWatermarks({
  progress,
  evaluated,
  processedUpTo,
  budgetExhausted,
}: {
  progress: EngineProgress;
  evaluated: StrategyWindow[];
  processedUpTo: number;
  budgetExhausted: boolean;
}): EngineProgress['watermarks'] {
  return evaluated.reduce(
    (watermarks, window) => {
      const reached = budgetExhausted
        ? Math.max(window.from, Math.min(window.to, processedUpTo))
        : window.to;
      return { ...watermarks, [window.strategy]: new Date(reached).toISOString() };
    },
    { ...progress.watermarks }
  );
}
