/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EngineAutoRunState,
  EngineHealth,
  EngineOverviewResponse,
  EngineProgress,
  EngineRulesState,
  EngineServicesResponse,
} from '../../../common';
import { SIGNAL_STRATEGY_IDS, HOUR_MS, MINUTE_MS } from '../../../common';
import { emptyLedger, resolveModelKey, toPricePerMillion } from '../cost/cost';
import type { IEngineScope } from '../engine/engine_scope';
import { createRunKnowledge } from '../engine/knowledge';
import { EMPTY_PROGRESS } from '../engine/run_engine';
import { proposeStrategyChanges, scoreStrategies } from '../learning/learning';
import { EMPTY_RULES_RECORD } from '../rules/ensure_rules';
import { STRATEGIES } from '../strategies/strategy_registry';

/** No run for this long while the schedule is on means the engine stopped, not that all is well. */
const STALLED_AFTER_MS = 5 * MINUTE_MS;
/** Behind real time by more than this, events arrive too late to act on. */
const DEGRADED_LAG_MS = 15 * MINUTE_MS;
const DEGRADED_AFTER_FAILURES = 3;

/**
 * Whether the engine is working. Silence is not proof of health: a stopped schedule, a run that
 * keeps failing or a strategy far behind all show here, so an empty event list never reads as
 * "nothing is wrong" when the engine is simply not looking.
 */
export function engineHealth({
  autoRun,
  progress,
  lagMs,
  rules,
  now,
}: {
  autoRun: EngineAutoRunState;
  progress: EngineProgress;
  lagMs?: number;
  rules: EngineRulesState;
  now: number;
}): EngineHealth {
  if (!autoRun.enabled) {
    return {
      status: 'off',
      reasons: ['The schedule is off: nothing is watched unless someone presses Run now.'],
    };
  }
  const sinceRun = progress.last_run_at ? now - Date.parse(progress.last_run_at) : undefined;
  if (autoRun.error || sinceRun === undefined || sinceRun > STALLED_AFTER_MS) {
    return {
      status: 'stalled',
      reasons: [
        autoRun.error
          ? `The schedule could not be set: ${autoRun.error}`
          : sinceRun === undefined
          ? 'The schedule is on but the engine has never run.'
          : `The engine has not run for ${Math.round(sinceRun / MINUTE_MS)} min.`,
      ],
    };
  }
  const reasons = [
    ...(progress.consecutive_failures >= DEGRADED_AFTER_FAILURES
      ? [`${progress.consecutive_failures} runs in a row failed: ${progress.last_error ?? ''}`]
      : []),
    ...(lagMs !== undefined && lagMs > DEGRADED_LAG_MS
      ? [`The slowest strategy is ${Math.round(lagMs / MINUTE_MS)} min behind real time.`]
      : []),
    ...(rules.error ? [`Rules could not be reconciled: ${rules.error}`] : []),
    ...rules.strategies.flatMap((strategy) =>
      strategy.errors.map((error) => `${strategy.strategy} rules: ${error}`)
    ),
  ];
  return { status: reasons.length > 0 ? 'degraded' : 'healthy', reasons };
}

/** Everything the signal page shows at a glance. */
export async function buildOverview(scope: IEngineScope): Promise<EngineOverviewResponse> {
  const { storage } = scope;
  const now = Date.now();
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const today = new Date(now).toISOString().slice(0, 10);

  const [
    config,
    lastRun,
    progress,
    counts,
    openedToday,
    signalsLastHour,
    ledger,
    prices,
    autoRun,
    rules,
    scorecards,
  ] = await Promise.all([
    storage.getConfig(),
    storage.state.get('last_run'),
    storage.state.get('progress'),
    storage.events.counts(),
    storage.events.countCreatedSince(dayStart.toISOString()),
    storage.records.countSignals(new Date(now - HOUR_MS).toISOString()),
    storage.state.get('cost'),
    scope.getPrices(),
    storage.state.get('auto_run'),
    storage.state.get('rules'),
    scoreStrategies(storage),
  ]);

  const model =
    config.agent.kind === 'agent_builder' && config.agent.connector_id
      ? await resolveModelKey({
          inferenceClient: scope.inferenceClient,
          connectorId: config.agent.connector_id,
        })
      : undefined;
  const modelPrice = model ? prices?.prices.get(model) : undefined;
  const currentLedger = ledger ?? emptyLedger(new Date(now).toISOString());
  const currentProgress = progress ?? EMPTY_PROGRESS;
  const rulesRecord = rules ?? EMPTY_RULES_RECORD;

  // Lag of the slowest live strategy, beyond the settle delay it waits for by design.
  const lags = SIGNAL_STRATEGY_IDS.filter((id) => config.strategies[id].mode !== 'off').flatMap(
    (id) => {
      const watermark = currentProgress.watermarks[id];
      return watermark
        ? [Math.max(0, now - Date.parse(watermark) - STRATEGIES[id].descriptor.settleMs)]
        : [];
    }
  );

  const lagMs = lags.length > 0 ? Math.max(...lags) : undefined;
  const rulesState: EngineRulesState = {
    reconciled_at: rulesRecord.reconciled_at,
    created: rulesRecord.created,
    deleted: rulesRecord.deleted,
    strategies: rulesRecord.strategies,
    error: rulesRecord.error,
  };
  const autoRunState = autoRun ?? { enabled: false };

  return {
    config,
    strategies: SIGNAL_STRATEGY_IDS.map((id) => ({
      ...STRATEGIES[id].descriptor,
      config: config.strategies[id],
      scorecard: scorecards[id],
      opened_today: openedToday[id] ?? 0,
      rules: rulesRecord.strategies.find((strategy) => strategy.strategy === id),
    })),
    proposals: proposeStrategyChanges({ config, scorecards }),
    last_run: lastRun,
    progress: currentProgress,
    lag_ms: lagMs,
    counts: {
      open_events: counts.open,
      events: counts.events,
      signals_last_hour: signalsLastHour,
    },
    cost: {
      ledger: currentLedger,
      today_usd: currentLedger.by_day[today]?.usd ?? 0,
      today_calls: currentLedger.by_day[today]?.calls ?? 0,
      today_tokens: currentLedger.by_day[today]?.tokens ?? 0,
      current_price: model && modelPrice ? toPricePerMillion(model, modelPrice) : undefined,
      prices_available: prices !== null,
      prices_fetched_at: prices?.fetchedAt,
    },
    auto_run: autoRunState,
    rules: rulesState,
    agent_builder_available: scope.agentBuilderAvailable,
    health: engineHealth({
      autoRun: autoRunState,
      progress: currentProgress,
      lagMs,
      rules: rulesState,
      now,
    }),
  };
}

/** Everything the engine watches and found, organised by service, with who calls whom. */
export async function listServices(scope: IEngineScope): Promise<EngineServicesResponse> {
  const { storage } = scope;
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const [activity, open, dependencies] = await Promise.all([
    storage.records.serviceActivity(since),
    storage.events.listOpen(5_000),
    scope.listSources().then((sources) => createRunKnowledge({ scope, sources }).getDependencies()),
  ]);
  const services = new Set([
    ...activity.map((item) => item.service),
    ...open.events.flatMap(({ event }) => event.services),
  ]);
  const summaries = [...services].sort().map((service) => {
    const measured = activity.find((item) => item.service === service);
    const serviceEvents = open.events
      .map(({ event }) => event)
      .filter((event) => event.services.includes(service));
    return {
      service,
      watched_by: measured?.strategies ?? [],
      signals_last_hour: measured?.signals ?? 0,
      open_events: serviceEvents.length,
      last_event_title: serviceEvents[0]?.title,
      last_event_id: serviceEvents[0]?.event_id,
    };
  });
  return {
    services: summaries,
    // Only relationships the page can draw: both ends are services the engine watches.
    dependencies: dependencies.filter(
      (dependency) => services.has(dependency.source) && services.has(dependency.target)
    ),
  };
}
