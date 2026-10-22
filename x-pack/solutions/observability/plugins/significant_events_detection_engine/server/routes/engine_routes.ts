/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type {
  ActivityEntry,
  EngineAutoRunState,
  EngineConfig,
  EngineOverviewResponse,
  EnginePage,
  EngineRulesState,
  EngineRunSummary,
  ReplaySummary,
} from '../../common';
import {
  AUTONOMY_LEVELS,
  DETECTION_ENGINE_API_BASE_PATH,
  SIGNAL_STRATEGY_IDS,
  LEARNING_CAPABILITIES,
  STRATEGY_MODES,
} from '../../common';
import { createRunKnowledge } from '../lib/engine/knowledge';
import { replayEngine } from '../lib/engine/replay';
import { runEngine } from '../lib/engine/run_engine';
import { learningDue, runLearning } from '../lib/learning/learning_loop';
import { buildOverview } from '../lib/overview/overview';
import { ensureRules } from '../lib/rules/ensure_rules';
import { withConfigDefaults } from '../lib/storage/engine_storage';
import { LONG_RUN_IDLE_SOCKET_MS, abortSignalOf, createRoute } from './create_route';

/** What rule reconciliation reads from knowledge. */
const knowledgeFor = (knowledge: ReturnType<typeof createRunKnowledge>) => ({
  getQueryLinks: () => knowledge.getQueryLinks(),
  getLearnedDetectors: () => knowledge.getLearnedDetectors(),
});

/** A scheduled learning pass needs at least this long, and never takes more. */
const MIN_LEARNING_BUDGET_MS = 30_000;
const MAX_LEARNING_BUDGET_MS = 90_000;

const READ = { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } };
const MANAGE = { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } };

const configUpdateSchema = z.object({
  strategies: z
    .partialRecord(
      z.enum(SIGNAL_STRATEGY_IDS),
      z.object({ mode: z.enum(STRATEGY_MODES), daily_cap: z.number().int().min(0).max(1000) })
    )
    .optional(),
  agent: z
    .object({
      kind: z.enum(['heuristic', 'agent_builder']),
      connector_id: z.string().max(255).optional(),
    })
    .optional(),
  baseline: z
    .object({
      min_samples: z.number().int().min(3).max(100).optional(),
      history_buckets: z.number().int().min(10).max(100).optional(),
      mad_k: z.number().min(1).max(10).optional(),
      count_noise_k: z.number().min(0).max(10).optional(),
    })
    .optional(),
  quiet_period_buckets: z.number().int().min(1).max(60).optional(),
  join_window_minutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .optional(),
  worse_margin: z.number().min(0).max(10).optional(),
  max_agent_calls_per_run: z.number().int().min(0).max(100).optional(),
  max_agent_calls_per_day: z.number().int().min(0).max(100_000).optional(),
  publish_to_alerting_v2: z.boolean().optional(),
  triage: z
    .object({
      event_search: z.boolean().optional(),
      source_scoped_dependencies: z.boolean().optional(),
      request_path_dependencies: z.boolean().optional(),
      evidence_named_joins: z.boolean().optional(),
      verifier_closes: z.boolean().optional(),
      regroup_recurrences: z.boolean().optional(),
      alert_firing_frequency: z.boolean().optional(),
      rule_entity_connector_id: z.string().max(255).optional(),
    })
    .optional(),
  learning: z
    .object({
      autonomy: z.partialRecord(z.enum(LEARNING_CAPABILITIES), z.enum(AUTONOMY_LEVELS)).optional(),
      interval_minutes: z
        .number()
        .int()
        .min(1)
        .max(24 * 60)
        .optional(),
      acceptance: z
        .object({
          max_warning_minutes: z
            .number()
            .min(1)
            .max(24 * 60)
            .optional(),
          max_false_opens_per_day: z.number().min(0).max(1_000).optional(),
          min_trial_minutes: z
            .number()
            .int()
            .min(0)
            .max(30 * 24 * 60)
            .optional(),
          rollback_dismissals: z.number().int().min(1).max(100).optional(),
          watch_minutes: z
            .number()
            .int()
            .min(0)
            .max(30 * 24 * 60)
            .optional(),
        })
        .optional(),
      replay_hours: z.number().min(1).max(72).optional(),
      max_model_calls_per_pass: z.number().int().min(0).max(50).optional(),
    })
    .optional(),
});

const overviewRoute = createRoute({
  endpoint: `GET ${DETECTION_ENGINE_API_BASE_PATH}/overview`,
  options: { access: 'internal', summary: 'Detection engine overview' },
  security: READ,
  params: z.object({}),
  handler: async ({ request, getStartServices }): Promise<EngineOverviewResponse> => {
    const { createScope } = await getStartServices();
    return buildOverview(await createScope(request));
  },
});

const updateConfigRoute = createRoute({
  endpoint: `PUT ${DETECTION_ENGINE_API_BASE_PATH}/config`,
  options: { access: 'internal', summary: 'Update detection engine settings' },
  security: MANAGE,
  params: z.object({ body: configUpdateSchema }),
  handler: async ({ request, params, getStartServices }): Promise<EngineConfig> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const { body } = params;
    const versioned = await scope.storage.state.getVersioned('config');
    const current = withConfigDefaults(versioned?.doc);
    const next: EngineConfig = withConfigDefaults({
      ...current,
      ...body,
      strategies: { ...current.strategies, ...body.strategies },
      agent: body.agent ?? current.agent,
      baseline: { ...current.baseline, ...body.baseline },
      triage: { ...current.triage, ...body.triage },
      learning: {
        ...current.learning,
        ...body.learning,
        autonomy: { ...current.learning.autonomy, ...body.learning?.autonomy },
        acceptance: { ...current.learning.acceptance, ...body.learning?.acceptance },
      },
    });
    // Conditional on what was read: two admins saving at once cannot silently undo each other.
    await scope.storage.state.put('config', next, {
      ...(versioned ? { ifVersion: versioned.version } : { create: true }),
    });

    const now = new Date().toISOString();
    const changedStrategies = SIGNAL_STRATEGY_IDS.filter(
      (id) =>
        current.strategies[id].mode !== next.strategies[id].mode ||
        current.strategies[id].daily_cap !== next.strategies[id].daily_cap
    );
    const activity: ActivityEntry[] = [
      ...changedStrategies.map(
        (id): ActivityEntry => ({
          '@timestamp': now,
          step: 'learning',
          action: 'strategy_changed',
          strategy: id,
          message: `${id}: mode ${next.strategies[id].mode}, daily cap ${next.strategies[id].daily_cap}.`,
        })
      ),
      ...(body.agent &&
      (body.agent.kind !== current.agent.kind ||
        body.agent.connector_id !== current.agent.connector_id)
        ? [
            {
              '@timestamp': now,
              step: 'agent' as const,
              action: 'configured',
              message: `Triage agent set to ${body.agent.kind}${
                body.agent.connector_id ? ` (${body.agent.connector_id})` : ''
              }.`,
            },
          ]
        : []),
    ];
    // A strategy turned on or off needs its rules now, with this admin's credentials.
    const sources = await scope.listSources();
    await ensureRules({
      scope,
      config: next,
      sources,
      ...knowledgeFor(createRunKnowledge({ scope, sources })),
      current: await scope.storage.state.get('rules'),
      signal: abortSignalOf(request),
      log: (entry) => activity.push({ ...entry, '@timestamp': new Date().toISOString() }),
    });
    await scope.storage.records.appendActivity(activity);
    return next;
  },
});

const runRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/_run`,
  options: {
    access: 'internal',
    summary: 'Run the detection engine now over the minutes that settled since its last run',
    timeout: { idleSocket: LONG_RUN_IDLE_SOCKET_MS },
  },
  security: MANAGE,
  params: z.object({
    body: z
      .object({
        /** Evaluates the minute that ends before this time, to backtest past data in order. */
        now: isoDateTime().optional(),
      })
      // The page's Run now sends no body, which arrives as null.
      .nullish(),
  }),
  handler: async ({ request, params, getStartServices }): Promise<EngineRunSummary> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const now = params?.body?.now;
    if (now) {
      return runEngine(scope, {
        trigger: 'backtest',
        now: Date.parse(now),
        signal: abortSignalOf(request),
      });
    }
    return runEngine(scope, { trigger: 'manual', signal: abortSignalOf(request) });
  },
});

const tickRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/_tick`,
  options: {
    access: 'internal',
    summary: 'The scheduled run, called every minute by the engine managed workflow',
    timeout: { idleSocket: LONG_RUN_IDLE_SOCKET_MS },
  },
  security: MANAGE,
  params: z.object({ body: z.object({}).passthrough().nullish() }),
  handler: async ({ request, getStartServices }): Promise<EngineRunSummary> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const startedAt = Date.now();
    const summary = await runEngine(scope, { trigger: 'schedule', signal: abortSignalOf(request) });
    // Learning runs after the signal it learns from, and only with time left over: it gives
    // way to live detection by construction.
    const config = await scope.storage.getConfig();
    const left = startedAt + scope.limits.timeBudgetMs - Date.now();
    if (left > MIN_LEARNING_BUDGET_MS && (await learningDue(scope, config))) {
      await runLearning(scope, {
        trigger: 'schedule',
        deadline: Date.now() + Math.min(left, MAX_LEARNING_BUDGET_MS),
        signal: abortSignalOf(request),
      });
    }
    return summary;
  },
});

const autoRunRoute = createRoute({
  endpoint: `PUT ${DETECTION_ENGINE_API_BASE_PATH}/auto_run`,
  options: { access: 'internal', summary: "Turn the detection engine's schedule on or off" },
  security: MANAGE,
  params: z.object({ body: z.object({ enabled: z.boolean() }) }),
  handler: async ({ request, params, getStartServices }): Promise<EngineAutoRunState> => {
    const { createScope, scheduler } = await getStartServices();
    const scope = await createScope(request);
    return scheduler.set({
      request,
      spaceId: scope.spaceId,
      storage: scope.storage,
      enabled: params.body.enabled,
    });
  },
});

const replayRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/_replay`,
  options: {
    access: 'internal',
    summary: 'Replay strategies over past minutes',
    timeout: { idleSocket: LONG_RUN_IDLE_SOCKET_MS },
  },
  security: MANAGE,
  params: z.object({
    body: z.object({
      minutes: z
        .number()
        .int()
        .min(5)
        .max(24 * 60),
      /** Replays the minutes before this time instead of before now, to seed a backtest. */
      now: isoDateTime().optional(),
    }),
  }),
  handler: async ({ request, params, getStartServices }): Promise<ReplaySummary> => {
    const { createScope } = await getStartServices();
    return replayEngine(await createScope(request), {
      minutes: params.body.minutes,
      now: params.body.now ? Date.parse(params.body.now) : undefined,
      signal: abortSignalOf(request),
    });
  },
});

const reconcileRulesRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/rules/_reconcile`,
  options: {
    access: 'internal',
    summary: "Rebuild the engine's Alerting v2 rules now, with the caller's credentials",
  },
  security: MANAGE,
  params: z.object({}),
  handler: async ({ request, getStartServices }): Promise<EngineRulesState> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const activity: ActivityEntry[] = [];
    const sources = await scope.listSources();
    const record = await ensureRules({
      scope,
      config: await scope.storage.getConfig(),
      sources,
      ...knowledgeFor(createRunKnowledge({ scope, sources })),
      current: await scope.storage.state.get('rules'),
      force: true,
      signal: abortSignalOf(request),
      log: (entry) => activity.push({ ...entry, '@timestamp': new Date().toISOString() }),
    });
    await scope.storage.records.appendActivity(activity);
    const { owned: _owned, ...state } = record;
    return state;
  },
});

const runsRoute = createRoute({
  endpoint: `GET ${DETECTION_ENGINE_API_BASE_PATH}/runs`,
  options: { access: 'internal', summary: 'Recent detection engine runs' },
  security: READ,
  params: z.object({
    query: z
      .object({
        size: z.coerce.number().int().min(1).max(200).optional(),
        cursor: z.string().max(2_000).optional(),
      })
      .optional(),
  }),
  handler: async ({ request, params, getStartServices }): Promise<EnginePage<EngineRunSummary>> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    return scope.storage.records.listRuns({
      size: params?.query?.size ?? 50,
      cursor: params?.query?.cursor,
    });
  },
});

const resetRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/_reset`,
  options: {
    access: 'internal',
    summary: 'Delete what the detection engine produced in this space',
  },
  security: MANAGE,
  params: z.object({
    body: z.object({ include_learning: z.boolean().optional() }).nullish(),
  }),
  handler: async ({ request, params, getStartServices }): Promise<{ reset: true }> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    // Settings, the schedule, the rules it owns and the cost counter stay: the counter feeds the
    // daily model budget, and the rules and schedule keep running after a reset. What people
    // taught the engine stays too, unless asked.
    await scope.storage.clearRunData({ includeLearning: params?.body?.include_learning });
    return { reset: true };
  },
});

export const engineRoutes = {
  ...overviewRoute,
  ...updateConfigRoute,
  ...runRoute,
  ...tickRoute,
  ...autoRunRoute,
  ...replayRoute,
  ...reconcileRulesRoute,
  ...runsRoute,
  ...resetRoute,
};
