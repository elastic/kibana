/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type {
  ActivityEntry,
  EngineDetection,
  EngineEvent,
  EngineEventDetailsResponse,
  EngineServicesResponse,
  EventEvidenceResponse,
  EventSeriesResponse,
} from '../../common';
import {
  ACTIVITY_STEPS,
  DETECTION_ENGINE_API_BASE_PATH,
  DETECTION_OUTCOMES,
  DETECTION_STRATEGY_IDS,
  DISMISSAL_REASONS,
  ENGINE_EVENT_STATUSES,
} from '../../common';
import { DetectionEngineError } from '../lib/errors';
import { applyOperatorInput, verifyEvent } from '../lib/operator/operator_actions';
import { readEventEvidence, readEventSeries } from '../lib/overview/event_inspection';
import { listServices } from '../lib/overview/overview';
import { createRoute } from './create_route';

const READ = { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } };
const MANAGE = { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } };

const DEFAULT_PAGE_SIZE = 100;
const pageQuery = {
  size: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().max(2_000).optional(),
};
const eventIdPath = z.object({ id: z.string().min(1).max(255) });

const eventsRoute = createRoute({
  endpoint: `GET ${DETECTION_ENGINE_API_BASE_PATH}/events`,
  options: { access: 'internal', summary: 'List detection engine events, newest first' },
  security: READ,
  params: z.object({
    query: z
      .object({
        status: z.enum(ENGINE_EVENT_STATUSES).optional(),
        service: z.string().max(255).optional(),
        ...pageQuery,
      })
      .optional(),
  }),
  handler: async ({
    request,
    params,
    getStartServices,
  }): Promise<{ events: EngineEvent[]; next_cursor?: string }> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const query = params?.query;
    const page = await scope.storage.events.list({
      statuses: query?.status ? [query.status] : undefined,
      service: query?.service,
      size: query?.size ?? DEFAULT_PAGE_SIZE,
      cursor: query?.cursor,
    });
    return { events: page.items, next_cursor: page.next_cursor };
  },
});

const eventRoute = createRoute({
  endpoint: `GET ${DETECTION_ENGINE_API_BASE_PATH}/events/{id}`,
  options: { access: 'internal', summary: 'Get one detection engine event with its trail' },
  security: READ,
  params: z.object({ path: eventIdPath }),
  handler: async ({ request, params, getStartServices }): Promise<EngineEventDetailsResponse> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const found = await scope.storage.events.get(params.path.id);
    if (!found) {
      throw new DetectionEngineError(`Event ${params.path.id} not found`, 404);
    }
    const [detections, activity] = await Promise.all([
      scope.storage.records.listDetections({ eventId: params.path.id, size: 500 }),
      scope.storage.records.listActivity({ eventId: params.path.id, size: 500 }),
    ]);
    return { event: found.event, detections: detections.items, activity: activity.items };
  },
});

const eventEvidenceRoute = createRoute({
  endpoint: `GET ${DETECTION_ENGINE_API_BASE_PATH}/events/{id}/evidence`,
  options: { access: 'internal', summary: "Run one signal's evidence query of an event" },
  security: READ,
  params: z.object({
    path: eventIdPath,
    query: z.object({ fingerprint: z.string().min(1).max(1_000) }),
  }),
  handler: async ({ request, params, getStartServices }): Promise<EventEvidenceResponse> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const found = await scope.storage.events.get(params.path.id);
    if (!found) {
      throw new DetectionEngineError(`Event ${params.path.id} not found`, 404);
    }
    return readEventEvidence({ scope, event: found.event, fingerprint: params.query.fingerprint });
  },
});

const eventSeriesRoute = createRoute({
  endpoint: `GET ${DETECTION_ENGINE_API_BASE_PATH}/events/{id}/series`,
  options: { access: 'internal', summary: "Measured values of an event's signals over time" },
  security: READ,
  params: z.object({ path: eventIdPath }),
  handler: async ({ request, params, getStartServices }): Promise<EventSeriesResponse> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const found = await scope.storage.events.get(params.path.id);
    if (!found) {
      throw new DetectionEngineError(`Event ${params.path.id} not found`, 404);
    }
    return readEventSeries({ scope, event: found.event });
  },
});

const dismissRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/events/{id}/_dismiss`,
  options: { access: 'internal', summary: 'Dismiss a detection engine event with a reason' },
  security: MANAGE,
  params: z.object({
    path: eventIdPath,
    body: z.object({ reason: z.enum(DISMISSAL_REASONS), note: z.string().max(500).optional() }),
  }),
  handler: async ({ request, params, getStartServices }): Promise<EngineEvent> => {
    const { createScope } = await getStartServices();
    return applyOperatorInput({
      scope: await createScope(request),
      eventId: params.path.id,
      input: 'dismiss',
      reason: params.body.reason,
      note: params.body.note,
    });
  },
});

const closeRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/events/{id}/_close`,
  options: { access: 'internal', summary: 'Close a detection engine event as an operator' },
  security: MANAGE,
  params: z.object({ path: eventIdPath }),
  handler: async ({ request, params, getStartServices }): Promise<EngineEvent> => {
    const { createScope } = await getStartServices();
    return applyOperatorInput({
      scope: await createScope(request),
      eventId: params.path.id,
      input: 'operator_close',
    });
  },
});

const verifyRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/events/{id}/_verify`,
  options: { access: 'internal', summary: "Re-run a detection engine event's evidence" },
  security: MANAGE,
  params: z.object({ path: eventIdPath }),
  handler: async ({ request, params, getStartServices }): Promise<EngineEvent> => {
    const { createScope } = await getStartServices();
    return verifyEvent({ scope: await createScope(request), eventId: params.path.id });
  },
});

const detectionsRoute = createRoute({
  endpoint: `GET ${DETECTION_ENGINE_API_BASE_PATH}/detections`,
  options: { access: 'internal', summary: 'List detection engine detections, newest first' },
  security: READ,
  params: z.object({
    query: z
      .object({
        strategy: z.enum(DETECTION_STRATEGY_IDS).optional(),
        outcome: z.enum(DETECTION_OUTCOMES).optional(),
        ...pageQuery,
      })
      .optional(),
  }),
  handler: async ({
    request,
    params,
    getStartServices,
  }): Promise<{ detections: EngineDetection[]; next_cursor?: string }> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const query = params?.query;
    const page = await scope.storage.records.listDetections({
      strategy: query?.strategy,
      outcome: query?.outcome,
      size: query?.size ?? DEFAULT_PAGE_SIZE * 5,
      cursor: query?.cursor,
    });
    return { detections: page.items, next_cursor: page.next_cursor };
  },
});

const activityRoute = createRoute({
  endpoint: `GET ${DETECTION_ENGINE_API_BASE_PATH}/activity`,
  options: { access: 'internal', summary: 'Detection engine activity log, newest first' },
  security: READ,
  params: z.object({
    query: z
      .object({
        step: z.enum(ACTIVITY_STEPS).optional(),
        run_id: z.string().max(255).optional(),
        ...pageQuery,
      })
      .optional(),
  }),
  handler: async ({
    request,
    params,
    getStartServices,
  }): Promise<{ activity: ActivityEntry[]; next_cursor?: string }> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const query = params?.query;
    const page = await scope.storage.records.listActivity({
      step: query?.step,
      runId: query?.run_id,
      size: query?.size ?? DEFAULT_PAGE_SIZE * 5,
      cursor: query?.cursor,
    });
    return { activity: page.items, next_cursor: page.next_cursor };
  },
});

const servicesRoute = createRoute({
  endpoint: `GET ${DETECTION_ENGINE_API_BASE_PATH}/services`,
  options: { access: 'internal', summary: 'Detection engine view by service' },
  security: READ,
  params: z.object({}),
  handler: async ({ request, getStartServices }): Promise<EngineServicesResponse> => {
    const { createScope } = await getStartServices();
    return listServices(await createScope(request));
  },
});

export const eventsRoutes = {
  ...eventsRoute,
  ...eventRoute,
  ...eventEvidenceRoute,
  ...eventSeriesRoute,
  ...dismissRoute,
  ...closeRoute,
  ...verifyRoute,
  ...detectionsRoute,
  ...activityRoute,
  ...servicesRoute,
};
