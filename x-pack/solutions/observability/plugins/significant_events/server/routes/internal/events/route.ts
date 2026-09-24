/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  significantEventInvestigationSchema,
  significantEventStatusSchema,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  CHANGE_POINT_TYPES,
  severitySchema,
  MAX_ID_LENGTH,
  MAX_ASSESSMENT_NOTE_LENGTH,
  triggerFeedbackSchema,
  type ChangePointType,
  type Detection,
  type InvestigationRunStatus,
  type SignificantEvent,
  type SignificantEventResponse,
  type LifecycleDetection,
  type EventLifecycleResponse,
} from '@kbn/significant-events-schema';
import { notFound, serverUnavailable } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import {
  attachInvestigationToEvent,
  type SignificantEventTriggerFeedback,
} from '../../../lib/significant_events/events/attach_investigation';
import { updateSignificantEventStatus } from '../../../lib/significant_events/events/update_event_status';
import {
  cleanupStaleEvents,
  type CleanupStaleEventsResult,
} from '../../../lib/significant_events/events/cleanup_stale_events';
import { triggerInvestigationWorkflow } from '../../../lib/significant_events/events/trigger_investigation_workflow';
import { resolveInvestigationStatuses } from '../../../lib/significant_events/events/resolve_investigation_status';
import type { PaginatedResponse } from '../../../lib/significant_events/query_utils';
import { createServerRoute } from '../../create_server_route';
import { assertNotPaused } from '../../utils/assert_not_paused';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

const toArray = <T extends string>(val: T | T[] | undefined): T[] | undefined =>
  val === undefined ? undefined : Array.isArray(val) ? val : [val];

const hasChangePointType = (hit: Detection): boolean => hit.change_point_type != null;

const parseChangePointType = (value: string | undefined): ChangePointType | undefined => {
  if (!value) {
    return undefined;
  }
  return CHANGE_POINT_TYPES.includes(value as ChangePointType)
    ? (value as ChangePointType)
    : undefined;
};

const collectEmbeddedDetections = (events: SignificantEvent[]) => {
  const seen = new Set<string>();
  const result: Array<Omit<LifecycleDetection, '@timestamp'>> = [];

  for (const event of events) {
    for (const signal of event.signals ?? []) {
      if (signal.type !== 'detection') continue;
      const { detection_id, rule_name, change_point_type } = signal.metadata;
      const streamName = signal.stream_name;
      const parsedChangePointType = parseChangePointType(change_point_type);
      if (
        !detection_id ||
        !rule_name ||
        !streamName ||
        !parsedChangePointType ||
        seen.has(detection_id)
      ) {
        continue;
      }
      seen.add(detection_id);
      result.push({
        detection_id,
        rule_name,
        stream_name: streamName,
        change_point_type: parsedChangePointType,
      });
    }
  }

  return result;
};

const eventsSearchRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/events',
  options: {
    access: 'internal',
    summary: 'Get latest events',
    description: 'Search event entities using their latest derived state with pagination.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(1000).optional(),
      status: z
        .union([
          significantEventStatusSchema,
          z.array(significantEventStatusSchema).max(SIGNIFICANT_EVENT_STATUS_OPTIONS.length),
        ])
        .optional(),
      stream: z.union([z.string().max(255), z.array(z.string().max(255)).max(50)]).optional(),
      search: z.string().max(500).optional(),
      event_id: z.string().max(255).optional(),
      severity: z.union([severitySchema, z.array(severitySchema).max(4)]).optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<PaginatedResponse<SignificantEventResponse>> => {
    const { getEventSearchClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const {
      status,
      stream,
      search,
      severity,
      from,
      to,
      event_id: eventId,
      ...rest
    } = params.query ?? {};

    const eventClient = await getEventSearchClient();
    return eventClient.findLatestByCurrentStatePaginated({
      ...rest,
      from,
      to,
      status: toArray(status),
      stream: toArray(stream),
      severity: toArray(severity),
      search: search || undefined,
      ...(eventId ? { eventIds: [eventId] } : {}),
    });
  },
});

const eventsLifecycleRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/events/{id}/lifecycle',
  options: {
    access: 'internal',
    summary: 'Get event lifecycle',
    description:
      'Get the full lifecycle chain for a significant event: detections and event versions.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().max(255),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<EventLifecycleResponse> => {
    const { getEventClient, getDetectionClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const eventClient = await getEventClient();
    const { hits: initialHits } = await eventClient.findByEventUuid(params.path.id);
    if (initialHits.length === 0) {
      return { detections: [], events: [] };
    }

    const { event_id: eventId } = initialHits[0];
    const { hits: events } = await eventClient.findByEventId(eventId);
    if (events.length === 0) {
      return { detections: [], events: [] };
    }

    const embedded = collectEmbeddedDetections(events);
    const detectionClient = await getDetectionClient();
    const { hits: allDetectionHits } = await detectionClient.findByIds(
      embedded.map((e) => e.detection_id)
    );
    const hitsByDetectionId = new Map(
      allDetectionHits.filter(hasChangePointType).map((h) => [h.detection_id, h])
    );

    const detections: LifecycleDetection[] = embedded.flatMap(
      ({ detection_id, rule_name, stream_name, change_point_type }) => {
        const hit = hitsByDetectionId.get(detection_id);
        if (!hit) {
          return [];
        }

        const hitChangePointType = parseChangePointType(hit.change_point_type);
        if (!hitChangePointType) {
          return [];
        }

        return [
          {
            detection_id,
            rule_name: hit.rule_name ?? rule_name,
            rule_uuid: hit.rule_uuid,
            stream_name: hit.stream_name ?? stream_name,
            change_point_type: hitChangePointType,
            '@timestamp': hit['@timestamp'],
          },
        ];
      }
    );

    return { detections, events };
  },
});

/** Used by the managed investigation-completed subscriber workflow. */
const eventsAttachInvestigationRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/events/{id}/investigations',
  options: {
    access: 'internal',
    summary: 'Attach investigation to event',
    description:
      'Record a completed investigation against a significant event and apply any trigger feedback in the same append-only version.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().max(255),
    }),
    body: significantEventInvestigationSchema
      .extend({
        trigger_feedback: z.array(triggerFeedbackSchema).max(3).optional(),
      })
      .required({ completed_at: true }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const { getEventClient, getAlertEventsClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const { trigger_feedback: triggerFeedback, ...investigation } = params.body;

    return attachInvestigationToEvent({
      eventClient: await getEventClient(),
      eventId: params.path.id,
      investigation,
      triggerFeedback: triggerFeedback as SignificantEventTriggerFeedback | undefined,
      alertEventsClient: await getAlertEventsClient(),
      logger,
    });
  },
});

const eventsTriggerInvestigationRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/events/{id}/investigate',
  options: {
    access: 'internal',
    summary: 'Trigger investigation workflow for a significant event',
    description:
      'Starts the managed investigation workflow for the given significant event and returns the workflow execution id.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().max(255),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
    maintenanceService,
  }): Promise<{ executionId: string }> => {
    const { getEventClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const eventClient = await getEventClient();
    const { hits } = await eventClient.findByEventUuid(params.path.id);
    if (hits.length === 0) {
      throw notFound(`Significant event "${params.path.id}" not found.`);
    }

    const executionId = await triggerInvestigationWorkflow({
      nightshiftInvestigations: server.nightshiftInvestigations,
      request,
      logger,
      event: hits[0],
    });

    if (!executionId) {
      throw serverUnavailable(
        'Investigation workflow is not available. Ensure workflows management is enabled and Kibana has finished installing managed workflows.'
      );
    }

    return { executionId };
  },
});

const eventsGetRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/events/{id}',
  options: {
    access: 'internal',
    summary: 'Get a significant event',
    description: 'Fetch the latest version of a single significant event by its event_uuid.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().max(255),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<SignificantEventResponse> => {
    const { getEventClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const eventClient = await getEventClient();
    const { hits: uuidHits } = await eventClient.findByEventUuid(params.path.id);
    if (uuidHits.length === 0) {
      throw notFound(`Significant event "${params.path.id}" not found.`);
    }

    const { event_id: eventId } = uuidHits[0];
    const { hits: versionHits } = await eventClient.findByEventId(eventId);
    if (versionHits.length === 0) {
      throw notFound(`Significant event "${params.path.id}" not found.`);
    }

    const event = versionHits.at(-1)!;

    return event;
  },
});

const eventsUpdateRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/events/{id}/update',
  options: {
    access: 'internal',
    summary: 'Update a significant event',
    description:
      'Manually override attributes of a significant event, writing a new append-only version.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().max(255),
    }),
    body: z
      .object({
        status: significantEventStatusSchema,
        assessment_note: z.string().max(MAX_ASSESSMENT_NOTE_LENGTH).optional(),
      })
      .superRefine((val, ctx) => {
        if (val.status === 'dismissed' && !val.assessment_note?.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['assessment_note'],
            message: 'assessment_note is required when dismissing an event',
          });
        }
      }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const { getEventClient, getAlertEventsClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    return updateSignificantEventStatus({
      eventClient: await getEventClient(),
      eventUuid: params.path.id,
      status: params.body.status,
      assessmentNote: params.body.assessment_note,
      alertEventsClient: await getAlertEventsClient(),
      logger,
    });
  },
});

const cleanupStaleEventsRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/events/_cleanup',
  options: {
    access: 'internal',
    summary: 'Close stale significant events',
    description: 'Closes open significant events when none of their backing rules still exist.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z
      .object({
        candidateRuleIds: z.array(z.string().max(MAX_ID_LENGTH)).max(1000).optional(),
      })
      .nullish(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<CleanupStaleEventsResult> => {
    const scopedClients = await getScopedClients({ request });
    const { getEventClient, getAlertEventsClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const { rulesClient } = await scopedClients.getSignificantEventsAlertingContext();

    return cleanupStaleEvents({
      eventClient: await getEventClient(),
      rulesClient,
      candidateRuleIds: params?.body?.candidateRuleIds,
      alertEventsClient: await getAlertEventsClient(),
      logger,
    });
  },
});

const investigationStatusesRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/investigations/_status',
  options: {
    access: 'internal',
    summary: 'Resolve the outcome of investigation runs',
    description:
      'Reports whether each investigation run is pending, complete, failed, or unavailable, resolved from its workflow execution. Missing executions are omitted from the response.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      workflow_execution_ids: z.array(z.string().max(MAX_ID_LENGTH)).max(1000),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
    getSpaceId,
  }): Promise<{ statuses: Record<string, InvestigationRunStatus> }> => {
    const { licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const statuses = await resolveInvestigationStatuses({
      workflowsManagement: server.workflowsManagement,
      spaceId: await getSpaceId(request),
      workflowExecutionIds: params.body.workflow_execution_ids,
      logger,
    });

    return { statuses };
  },
});

export const internalEventsRoutes = {
  ...eventsSearchRoute,
  ...eventsGetRoute,
  ...eventsLifecycleRoute,
  ...eventsAttachInvestigationRoute,
  ...eventsTriggerInvestigationRoute,
  ...eventsUpdateRoute,
  ...cleanupStaleEventsRoute,
  ...investigationStatusesRoute,
};
