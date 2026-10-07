/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, notFound } from '@hapi/boom';
import { severitySchema } from '@kbn/significant-events-schema';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { updateSignificantEventStatus } from '../../../lib/significant_events/events/update_event_status';
import { severityFeedbackKey } from '../../../lib/engine_preferences';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { readEnginePreferences, mutateEnginePreferences } from '../../../lib/engine_preferences';

const get = createServerRoute({
  endpoint: 'GET /internal/significant_events/engine_settings',
  options: { access: 'internal', summary: 'Read per-space detection settings and discovery usage' },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: z.object({}),
  handler: async ({ request, server, getScopedClients, getSpaceId }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    return readEnginePreferences(server, await getSpaceId(request));
  },
});
const put = createServerRoute({
  endpoint: 'PUT /internal/significant_events/engine_settings',
  options: { access: 'internal', summary: 'Update per-space detection controls' },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage, NIGHTSHIFT_API_PRIVILEGES.configure],
    },
  },
  params: z.object({
    body: z
      .object({
        confidenceThreshold: z.number().min(0).max(1).optional(),
        discoveryPaused: z.boolean().optional(),
        dailyDiscoveryLimit: z.number().int().min(0).max(10000).optional(),
        pausedStreams: z.array(z.string().min(1).max(1000)).max(10000).optional(),
      })
      .strict(),
  }),
  handler: async ({ request, params, server, getScopedClients, getSpaceId }) => {
    const { licensing, streamsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    if (!params.body) throw badRequest('Provide at least one detection setting.');
    if (params.body.pausedStreams) {
      const readable = new Set((await streamsClient.listStreams()).map((stream) => stream.name));
      if (params.body.pausedStreams.some((name) => !readable.has(name)))
        throw new Error('A stream is not accessible in this space');
    }
    const actor = server.core.security.authc.getCurrentUser(request)?.username ?? 'System';
    return mutateEnginePreferences(server, await getSpaceId(request), (current) => {
      const changed = Object.entries(params.body).filter(
        ([key, value]) =>
          JSON.stringify(current[key as keyof typeof current]) !== JSON.stringify(value)
      );
      if (!changed.length) return current;
      return {
        ...current,
        ...params.body,
        history: [
          ...current.history,
          ...changed.map(([key, value]) => ({
            timestamp: new Date().toISOString(),
            actor,
            message:
              key === 'discoveryPaused'
                ? value
                  ? 'Discovery paused'
                  : 'Discovery resumed'
                : key === 'dailyDiscoveryLimit'
                ? `Daily discovery limit: ${value || 'unlimited'}`
                : key === 'confidenceThreshold'
                ? `Minimum event confidence: ${Math.round(Number(value) * 100)}%`
                : `Paused learning streams: ${
                    Array.isArray(value) ? value.join(', ') || 'none' : ''
                  }`,
          })),
        ].slice(-200),
      };
    });
  },
});
const calibrate = createServerRoute({
  endpoint: 'POST /internal/significant_events/events/{id}/calibrate',
  options: {
    access: 'internal',
    summary: 'Correct event severity and optionally remember its evidence scope',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: z.object({
    path: z.object({ id: z.string().min(1).max(255) }),
    body: z.object({
      severity: severitySchema,
      reason: z.string().min(1).max(1000),
      remember: z.boolean(),
    }),
  }),
  handler: async ({ request, params, server, getScopedClients, getSpaceId }) => {
    const { licensing, getEventSearchClient, getAlertEventsClient, emitTrigger } =
      await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const eventSearchClient = await getEventSearchClient();
    const event = await eventSearchClient.findLatestByEventId(params.path.id);
    if (!event) throw notFound('Event not found');
    const key = severityFeedbackKey(event);
    if (params.body.remember && !key)
      throw badRequest('This event has no rule evidence to scope future feedback.');
    if (params.body.remember && key)
      await mutateEnginePreferences(server, await getSpaceId(request), (current) => ({
        ...current,
        severityFeedback: Object.fromEntries(
          Object.entries({
            ...current.severityFeedback,
            [key]: {
              severity: params.body.severity,
              reason: params.body.reason,
              updatedAt: new Date().toISOString(),
            },
          })
            .sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt))
            .slice(0, 500)
        ),
        history: [
          ...current.history,
          {
            timestamp: new Date().toISOString(),
            actor: server.core.security.authc.getCurrentUser(request)?.username ?? 'User',
            message: `Severity feedback saved: ${params.body.severity} · ${event.title}`,
          },
        ].slice(-200),
      }));
    return updateSignificantEventStatus({
      eventSearchClient,
      eventId: event.event_id,
      status: event.status,
      severity: params.body.severity,
      assessmentNote: `User severity correction: ${params.body.reason}`,
      alertEventsClient: await getAlertEventsClient(),
      emitTrigger,
    });
  },
});
const forget = createServerRoute({
  endpoint: 'DELETE /internal/significant_events/engine_settings/severity_feedback',
  options: { access: 'internal', summary: 'Forget severity feedback for one evidence scope' },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: z.object({ body: z.object({ key: z.string().min(1).max(20000) }) }),
  handler: async ({ request, params, server, getScopedClients, getSpaceId }) => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    return mutateEnginePreferences(server, await getSpaceId(request), (current) => {
      const feedback = { ...current.severityFeedback };
      delete feedback[params.body.key];
      return { ...current, severityFeedback: feedback };
    });
  },
});
export const internalEnginePreferencesRoutes = { ...get, ...put, ...calibrate, ...forget };
