/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, z } from '@kbn/zod/v4';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import {
  ACTIVITY_STEPS,
  DETECTION_OUTCOMES,
  DETECTION_STRATEGY_IDS,
  DISMISSAL_REASONS,
  ENGINE_EVENT_STATUSES,
  STRATEGY_MODES,
  type ActivityEntry,
  type EngineConfig,
  type EngineDetection,
  type EngineEvent,
  type EngineEventDetailsResponse,
  type EngineOverviewResponse,
  type EngineRunSummary,
  type LabIncident,
  type LabState,
  type ServiceSummary,
} from '../../../../common/detection_engine/types';
import {
  type EngineDependencies,
  type ReplaySummary,
  replayEngine,
  runEngine,
} from '../../../lib/detection_engine/engine';
import {
  createLabService,
  LAB_BACKFILL_MINUTES,
} from '../../../lib/detection_engine/lab/lab_service';
import { applyOperatorInput, verifyEvent } from '../../../lib/detection_engine/operator_actions';
import { buildOverview, listServices } from '../../../lib/detection_engine/overview';
import { LAB_SOURCE_TITLE } from '../../../lib/detection_engine/constants';
import { createEngineStorage } from '../../../lib/detection_engine/storage';
import { StatusError } from '../../../lib/errors/status_error';
import { createServerRoute } from '../../create_server_route';
import type { SignificantEventsRouteHandlerResources } from '../../types';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { listAllSources } from '../../utils/list_all_sources';

const BASE_PATH = '/internal/significant_events/detection_engine';

const READ = { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } };
const MANAGE = { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } };

/** Builds the engine's dependencies for the request's user and space. */
async function createEngineDependencies({
  request,
  getScopedClients,
  server,
  logger,
  priceService,
}: {
  request: KibanaRequest;
  getScopedClients: SignificantEventsRouteHandlerResources['getScopedClients'];
  server: SignificantEventsRouteHandlerResources['server'];
  logger: Logger;
  priceService: SignificantEventsRouteHandlerResources['priceService'];
}): Promise<
  EngineDependencies & {
    createLab: () => ReturnType<typeof createLabService>;
  }
> {
  const clients = await getScopedClients({ request });
  await assertSignificantEventsAccess({ server, licensing: clients.licensing });
  const esClient = clients.scopedClusterClient.asCurrentUser;
  const storage = createEngineStorage({ esClient, spaceId: clients.space });
  const sources = await listAllSources(clients.sourcesClient, { enabled: true });

  return {
    storage,
    dataEsClient: clients.streamDataEsClient,
    esClient,
    spaceId: clients.space,
    sources,
    getKnowledgeIndicatorClient: () => clients.getKnowledgeIndicatorClient(),
    inferenceClient: clients.inferenceClient,
    getRuleEventsClient: clients.getEventSearchClient,
    getPrices: () => priceService.getPrices(),
    logger: logger.get('detection_engine'),
    createLab: () =>
      createLabService({
        esClient,
        storage,
        sourcesClient: clients.sourcesClient,
        getKnowledgeIndicatorClient: (source) => clients.getKnowledgeIndicatorClient(source),
      }),
  };
}

const overviewRoute = createServerRoute({
  endpoint: `GET ${BASE_PATH}/overview`,
  options: { access: 'internal', summary: 'Detection engine prototype overview' },
  security: READ,
  params: z.object({}),
  handler: async (resources): Promise<EngineOverviewResponse> => {
    const deps = await createEngineDependencies(resources);
    return buildOverview({
      storage: deps.storage,
      inferenceClient: deps.inferenceClient,
      getPrices: deps.getPrices,
    });
  },
});

const configSchema = z.object({
  strategies: z
    .partialRecord(
      z.enum(DETECTION_STRATEGY_IDS),
      z.object({
        mode: z.enum(STRATEGY_MODES),
        daily_cap: z.number().int().min(0).max(1000),
      })
    )
    .optional(),
  agent: z
    .object({ kind: z.enum(['heuristic', 'llm']), connector_id: z.string().max(255).optional() })
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
  publish_to_alerting_v2: z.boolean().optional(),
});

const updateConfigRoute = createServerRoute({
  endpoint: `PUT ${BASE_PATH}/config`,
  options: { access: 'internal', summary: 'Update detection engine prototype settings' },
  security: MANAGE,
  params: z.object({ body: configSchema }),
  handler: async (resources): Promise<EngineConfig> => {
    const deps = await createEngineDependencies(resources);
    await deps.storage.ensure();
    const current = await deps.storage.getConfig();
    const { body } = resources.params;
    const next: EngineConfig = {
      ...current,
      ...body,
      strategies: { ...current.strategies, ...body.strategies },
      agent: body.agent ?? current.agent,
    };
    await deps.storage.putState('config', next);
    const changedStrategies = Object.entries(body.strategies ?? {}).filter(
      ([id, value]) =>
        value &&
        (current.strategies[id as keyof EngineConfig['strategies']].mode !== value.mode ||
          current.strategies[id as keyof EngineConfig['strategies']].daily_cap !== value.daily_cap)
    );
    await deps.storage.appendActivity([
      ...changedStrategies.map(([id, value]) => ({
        step: 'learning' as const,
        action: 'strategy_changed',
        strategy: id as EngineDetection['strategy'],
        message: `${id}: mode ${value!.mode}, daily cap ${value!.daily_cap}.`,
      })),
      ...(body.agent && body.agent.kind !== current.agent.kind
        ? [
            {
              step: 'agent' as const,
              action: 'configured',
              message: `Discovery agent set to ${body.agent.kind}${
                body.agent.connector_id ? ` (${body.agent.connector_id})` : ''
              }.`,
            },
          ]
        : []),
    ]);
    return next;
  },
});

const runRoute = createServerRoute({
  endpoint: `POST ${BASE_PATH}/_run`,
  options: {
    access: 'internal',
    summary: 'Run the detection engine prototype over the last complete bucket',
  },
  security: MANAGE,
  params: z.object({
    body: z
      .object({
        /** Evaluates the bucket that ends before this time, to backtest past data in order. */
        now: isoDateTime().optional(),
      })
      .optional(),
  }),
  handler: async (resources): Promise<EngineRunSummary> => {
    const deps = await createEngineDependencies(resources);
    const now = resources.params?.body?.now;
    if (now) {
      return runEngine(deps, { now: Date.parse(now) });
    }
    // The lab writes logs up to now first, so the bucket being evaluated is complete.
    await deps.createLab().catchUp();
    return runEngine(deps);
  },
});

const replayRoute = createServerRoute({
  endpoint: `POST ${BASE_PATH}/_replay`,
  options: { access: 'internal', summary: 'Replay strategies over past buckets' },
  security: MANAGE,
  params: z.object({
    body: z.object({
      minutes: z
        .number()
        .int()
        .min(5)
        .max(24 * 60),
    }),
  }),
  handler: async (resources): Promise<ReplaySummary> => {
    const deps = await createEngineDependencies(resources);
    return replayEngine(deps, { minutes: resources.params.body.minutes });
  },
});

const eventsRoute = createServerRoute({
  endpoint: `GET ${BASE_PATH}/events`,
  options: { access: 'internal', summary: 'List detection engine events' },
  security: READ,
  params: z.object({
    query: z.object({ status: z.enum(ENGINE_EVENT_STATUSES).optional() }).optional(),
  }),
  handler: async (resources): Promise<{ events: EngineEvent[] }> => {
    const deps = await createEngineDependencies(resources);
    await deps.storage.ensure();
    const status = resources.params?.query?.status;
    return { events: await deps.storage.searchEvents({ statuses: status ? [status] : undefined }) };
  },
});

const eventRoute = createServerRoute({
  endpoint: `GET ${BASE_PATH}/events/{id}`,
  options: { access: 'internal', summary: 'Get one detection engine event with its trail' },
  security: READ,
  params: z.object({ path: z.object({ id: z.string().max(255) }) }),
  handler: async (resources): Promise<EngineEventDetailsResponse> => {
    const deps = await createEngineDependencies(resources);
    const event = await deps.storage.getEvent(resources.params.path.id);
    if (!event) {
      throw new StatusError(`Event ${resources.params.path.id} not found`, 404);
    }
    const [detections, activity] = await Promise.all([
      deps.storage.searchDetections({ eventId: event.event_id, size: 500 }),
      deps.storage.searchActivity({ eventId: event.event_id, size: 500 }),
    ]);
    return { event, detections, activity };
  },
});

const dismissRoute = createServerRoute({
  endpoint: `POST ${BASE_PATH}/events/{id}/_dismiss`,
  options: { access: 'internal', summary: 'Dismiss a detection engine event with a reason' },
  security: MANAGE,
  params: z.object({
    path: z.object({ id: z.string().max(255) }),
    body: z.object({ reason: z.enum(DISMISSAL_REASONS), note: z.string().max(500).optional() }),
  }),
  handler: async (resources): Promise<EngineEvent> => {
    const deps = await createEngineDependencies(resources);
    return applyOperatorInput({
      deps,
      eventId: resources.params.path.id,
      input: 'dismiss',
      reason: resources.params.body.reason,
      note: resources.params.body.note,
    });
  },
});

const closeRoute = createServerRoute({
  endpoint: `POST ${BASE_PATH}/events/{id}/_close`,
  options: { access: 'internal', summary: 'Close a detection engine event as an operator' },
  security: MANAGE,
  params: z.object({ path: z.object({ id: z.string().max(255) }) }),
  handler: async (resources): Promise<EngineEvent> => {
    const deps = await createEngineDependencies(resources);
    return applyOperatorInput({ deps, eventId: resources.params.path.id, input: 'operator_close' });
  },
});

const verifyRoute = createServerRoute({
  endpoint: `POST ${BASE_PATH}/events/{id}/_verify`,
  options: { access: 'internal', summary: "Re-run a detection engine event's evidence" },
  security: MANAGE,
  params: z.object({ path: z.object({ id: z.string().max(255) }) }),
  handler: async (resources): Promise<EngineEvent> => {
    const deps = await createEngineDependencies(resources);
    return verifyEvent({ deps, eventId: resources.params.path.id });
  },
});

const detectionsRoute = createServerRoute({
  endpoint: `GET ${BASE_PATH}/detections`,
  options: { access: 'internal', summary: 'List detection engine detections' },
  security: READ,
  params: z.object({
    query: z
      .object({
        strategy: z.enum(DETECTION_STRATEGY_IDS).optional(),
        outcome: z.enum(DETECTION_OUTCOMES).optional(),
      })
      .optional(),
  }),
  handler: async (resources): Promise<{ detections: EngineDetection[] }> => {
    const deps = await createEngineDependencies(resources);
    await deps.storage.ensure();
    return {
      detections: await deps.storage.searchDetections({
        strategy: resources.params?.query?.strategy,
        outcome: resources.params?.query?.outcome,
        size: 500,
      }),
    };
  },
});

const activityRoute = createServerRoute({
  endpoint: `GET ${BASE_PATH}/activity`,
  options: { access: 'internal', summary: 'Detection engine activity log' },
  security: READ,
  params: z.object({
    query: z.object({ step: z.enum(ACTIVITY_STEPS).optional() }).optional(),
  }),
  handler: async (resources): Promise<{ activity: ActivityEntry[] }> => {
    const deps = await createEngineDependencies(resources);
    await deps.storage.ensure();
    return {
      activity: await deps.storage.searchActivity({
        step: resources.params?.query?.step,
        size: 500,
      }),
    };
  },
});

const servicesRoute = createServerRoute({
  endpoint: `GET ${BASE_PATH}/services`,
  options: { access: 'internal', summary: 'Detection engine view by service' },
  security: READ,
  params: z.object({}),
  handler: async (resources): Promise<{ services: ServiceSummary[] }> => {
    const deps = await createEngineDependencies(resources);
    return { services: await listServices({ storage: deps.storage, esClient: deps.esClient }) };
  },
});

const labSetupRoute = createServerRoute({
  endpoint: `POST ${BASE_PATH}/lab/_setup`,
  options: {
    access: 'internal',
    summary: 'Create the detection engine lab: logs, source, knowledge and baselines',
  },
  security: MANAGE,
  params: z.object({}),
  handler: async (resources): Promise<{ lab: LabState; docs: number; replay: ReplaySummary }> => {
    const deps = await createEngineDependencies(resources);
    const { lab, docs, source } = await deps.createLab().setup();
    // The new source joins the watched set right away, then replay builds every baseline.
    const withLab = deps.sources.some((item) => item.id === source.id)
      ? deps
      : { ...deps, sources: [...deps.sources, source] };
    const replay = await replayEngine(withLab, { minutes: LAB_BACKFILL_MINUTES - 5 });
    return { lab, docs, replay };
  },
});

const labScenarioRoute = createServerRoute({
  endpoint: `POST ${BASE_PATH}/lab/_scenario`,
  options: {
    access: 'internal',
    summary: 'Load a labelled scenario: lab logs with past incidents, and a fresh engine state',
  },
  security: MANAGE,
  params: z.object({
    body: z.object({
      backfill_minutes: z
        .number()
        .int()
        .min(60)
        .max(24 * 60),
      /** Minutes before the end left for the engine to evaluate bucket by bucket. */
      evaluate_minutes: z.number().int().min(5).max(240),
      incidents: z
        .array(
          z.object({
            kind: z.enum(['error_spike', 'latency', 'silence', 'new_error']),
            service: z.string().max(64),
            start_minutes_ago: z.number().min(0),
            end_minutes_ago: z.number().min(0),
          })
        )
        .max(10),
      /**
       * Keeps the logs of the scenario that ended at this time and only resets the engine, so
       * several engine settings can be compared on identical data.
       */
      reuse_ends_at: isoDateTime().optional(),
    }),
  }),
  handler: async (
    resources
  ): Promise<{ lab: LabState; docs: number; ends_at: string; replay: ReplaySummary }> => {
    const deps = await createEngineDependencies(resources);
    const {
      backfill_minutes: backfillMinutes,
      evaluate_minutes: evaluateMinutes,
      incidents,
      reuse_ends_at: reuseEndsAt,
    } = resources.params.body;
    const lab = deps.createLab();
    const loaded = reuseEndsAt
      ? {
          lab: await lab.get(),
          docs: 0,
          source: deps.sources.find((item) => item.title === LAB_SOURCE_TITLE),
          endsAt: reuseEndsAt,
        }
      : await lab.loadScenario({ backfillMinutes, incidents });
    const { docs, source, endsAt } = loaded;
    if (!source) {
      throw new StatusError('The lab source does not exist; load a scenario first', 400);
    }
    await deps.storage.clearRunData();
    const withLab = deps.sources.some((item) => item.id === source.id)
      ? deps
      : { ...deps, sources: [...deps.sources, source] };
    // Baselines from the history before the evaluated window, which holds no incident.
    const replay = await replayEngine(withLab, {
      minutes: backfillMinutes - evaluateMinutes - 5,
      now: Date.parse(endsAt) - evaluateMinutes * 60_000 + 60_000,
    });
    return { lab: loaded.lab, docs, ends_at: endsAt, replay };
  },
});

const labIncidentRoute = createServerRoute({
  endpoint: `POST ${BASE_PATH}/lab/_incident`,
  options: { access: 'internal', summary: 'Start a lab incident' },
  security: MANAGE,
  params: z.object({
    body: z.object({
      kind: z.enum(['error_spike', 'latency', 'silence', 'new_error']),
      service: z.string().max(64),
    }),
  }),
  handler: async (resources): Promise<LabIncident> => {
    const deps = await createEngineDependencies(resources);
    return deps.createLab().startIncident(resources.params.body);
  },
});

const labStopRoute = createServerRoute({
  endpoint: `POST ${BASE_PATH}/lab/_stop`,
  options: { access: 'internal', summary: 'Stop one or every lab incident' },
  security: MANAGE,
  params: z.object({ body: z.object({ id: z.string().max(64).optional() }).optional() }),
  handler: async (resources): Promise<LabState> => {
    const deps = await createEngineDependencies(resources);
    return deps.createLab().stopIncident(resources.params?.body?.id);
  },
});

const labResetRoute = createServerRoute({
  endpoint: `POST ${BASE_PATH}/lab/_reset`,
  options: {
    access: 'internal',
    summary: 'Delete lab logs and every detection engine document of this space',
  },
  security: MANAGE,
  params: z.object({}),
  handler: async (resources): Promise<{ reset: true }> => {
    const deps = await createEngineDependencies(resources);
    await deps.createLab().reset();
    return { reset: true };
  },
});

export const internalDetectionEngineRoutes = {
  ...overviewRoute,
  ...updateConfigRoute,
  ...runRoute,
  ...replayRoute,
  ...eventsRoute,
  ...eventRoute,
  ...dismissRoute,
  ...closeRoute,
  ...verifyRoute,
  ...detectionsRoute,
  ...activityRoute,
  ...servicesRoute,
  ...labSetupRoute,
  ...labScenarioRoute,
  ...labIncidentRoute,
  ...labStopRoute,
  ...labResetRoute,
};
