/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  significantEventInvestigationSchema,
  significantEventStatusSchema,
  significantEventManualStatusSchema,
  SIGNIFICANT_EVENT_STATUS_OPTIONS,
  severitySchema,
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  type InvestigationRunStatus,
  type SignificantEventResponse,
  type LifecycleDetection,
  type EventLifecycleResponse,
} from '@kbn/significant-events-schema';
import { notFound, serverUnavailable } from '@hapi/boom';
import { z, isoDateTime } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { attachInvestigationToEvent } from '../../../lib/significant_events/events/attach_investigation';
import {
  cleanupStaleEvents,
  type CleanupStaleEventsResult,
} from '../../../lib/significant_events/events/cleanup_stale_events';
import { triggerInvestigationWorkflow } from '../../../lib/significant_events/events/trigger_investigation_workflow';
import { resolveInvestigationStatuses } from '../../../lib/significant_events/events/resolve_investigation_status';
import type { DetectionClient } from '../../../lib/significant_events/detections';
import type { PaginatedResponse } from '../../../lib/significant_events/query_utils';
import type { EventsFilterOptions } from '../../../lib/significant_events/events/types';
import {
  MAX_SIGNIFICANT_EVENTS_SEARCH_LENGTH,
  SIGNIFICANT_EVENT_INVESTIGATION_STATES,
  SIGNIFICANT_EVENTS_SORT_FIELDS,
  SIGNIFICANT_EVENTS_SORT_ORDERS,
  type SignificantEventsFacets,
} from '../../../../common/events_list';
import { createServerRoute } from '../../create_server_route';
import { assertNotPaused } from '../../utils/assert_not_paused';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { MAX_SOURCE_IDS_PER_REQUEST, sourceIdsQuerySchema } from '../../utils/resolve_source_ids';
import { StatusChange } from '../../../lib/significant_events/events/lifecycle/lifecycle_controller';
import {
  collectEmbeddedDetections,
  hasChangePointType,
  toLifecycleDetection,
  applyDeactivationReasons,
} from '../../../lib/significant_events/events/to_lifecycle_response';
import { getLiveEntities } from '../../../lib/significant_events/entities/get_live_entities';
import { filterReadableSourceIds } from '../../utils/resolve_source_ids';
import { listAllSources } from '../../utils/list_all_sources';
import type { RouteHandlerScopedClients } from '../../types';

const toArray = <T extends string>(val: T | T[] | undefined): T[] | undefined =>
  val === undefined ? undefined : Array.isArray(val) ? val : [val];

const investigationStateSchema = z.enum(SIGNIFICANT_EVENT_INVESTIGATION_STATES);

/** Filters shared by the list and facet reads, so their counts always describe the same set. */
const eventsFilterQuerySchema = z.object({
  from: isoDateTime().optional(),
  to: isoDateTime().optional(),
  status: z
    .union([
      significantEventStatusSchema,
      z.array(significantEventStatusSchema).max(SIGNIFICANT_EVENT_STATUS_OPTIONS.length),
    ])
    .optional(),
  source_id: sourceIdsQuerySchema(MAX_SOURCE_IDS_PER_REQUEST).describe(
    'Source ids to filter events by. One id or a repeated list.'
  ),
  search: z.string().max(MAX_SIGNIFICANT_EVENTS_SEARCH_LENGTH).optional(),
  severity: z.union([severitySchema, z.array(severitySchema).max(4)]).optional(),
  // Same cap as the agent `event_search` tool; the UI lets users select any number of services.
  topology_feature_id: z
    .union([z.string().max(255), z.array(z.string().max(255)).max(100)])
    .optional(),
  unassigned_entities: BooleanFromString.optional(),
  investigation_state: z
    .union([
      investigationStateSchema,
      z.array(investigationStateSchema).max(SIGNIFICANT_EVENT_INVESTIGATION_STATES.length),
    ])
    .optional(),
});

const toEventsFilterOptions = async (
  {
    from,
    to,
    status,
    source_id: sourceIdFilter,
    search,
    severity,
    topology_feature_id: topologyFeatureId,
    investigation_state: investigationState,
    unassigned_entities: unassignedEntities,
  }: z.infer<typeof eventsFilterQuerySchema>,
  scopedClients: RouteHandlerScopedClients
): Promise<
  EventsFilterOptions & {
    from?: string;
    to?: string;
  }
> => {
  let unassignedEntityIds: string[] | undefined;
  if (unassignedEntities) {
    const { sourcesClient, getKnowledgeIndicatorClient } = scopedClients;
    const sources = await listAllSources(sourcesClient);
    const sourceIds = await filterReadableSourceIds(
      sources.map(({ id }) => id),
      sourcesClient
    );
    const { entities, truncated } = await getLiveEntities(
      await getKnowledgeIndicatorClient(),
      sourceIds
    );
    // A truncated live set would misreport entities past the cap as unassigned, so skip the filter.
    if (!truncated) {
      unassignedEntityIds = entities.map(({ id }) => id);
    }
  }
  return {
    from,
    to,
    status: toArray(status),
    sourceIds: toArray(sourceIdFilter),
    severity: toArray(severity),
    topologyFeatureIds: toArray(topologyFeatureId),
    ...(unassignedEntityIds ? { unassignedEntityIds } : {}),
    investigationStates: toArray(investigationState),
    search: search || undefined,
  };
};

/**
 * The detections the classifier closed without the agent on the strength of this event. They are in
 * no signal, so they are found by the event their skip marker names; each marker says why.
 */
const findSkippedDetections = async ({
  detectionClient,
  eventId,
  known,
}: {
  detectionClient: Pick<DetectionClient, 'findSkippedForEvent'>;
  eventId: string;
  known: ReadonlySet<string>;
}): Promise<{ detections: LifecycleDetection[]; truncated: boolean }> => {
  const { hits, truncated } = await detectionClient.findSkippedForEvent(eventId);
  const detections = hits
    .flatMap((hit) => {
      const detection = toLifecycleDetection(hit);
      return detection && hit.skip && !known.has(hit.detection_id)
        ? [{ ...detection, skip: hit.skip }]
        : [];
    })
    .sort((a, b) => a['@timestamp'].localeCompare(b['@timestamp']));
  return { detections, truncated };
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
    query: eventsFilterQuerySchema.extend({
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(1000).optional(),
      event_id: z.string().max(255).optional(),
      sort_field: z.enum(SIGNIFICANT_EVENTS_SORT_FIELDS).optional(),
      sort_order: z.enum(SIGNIFICANT_EVENTS_SORT_ORDERS).optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<PaginatedResponse<SignificantEventResponse>> => {
    const scopedClients = await getScopedClients({ request });
    const { getEventSearchClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const {
      page,
      perPage,
      event_id: eventId,
      sort_field: sortField,
      sort_order: sortOrder,
      ...filters
    } = params.query ?? {};

    const eventClient = await getEventSearchClient();
    return eventClient.findLatestByCurrentStatePaginated({
      ...(await toEventsFilterOptions(filters, scopedClients)),
      page,
      perPage,
      sortField,
      sortOrder,
      ...(eventId ? { eventIds: [eventId] } : {}),
    });
  },
});

const eventsFacetsRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/events/_facets',
  options: {
    access: 'internal',
    summary: 'Count events per filter option',
    description:
      'Count the latest event states per severity, status and investigation state. Each dimension ignores its own filter.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: eventsFilterQuerySchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<SignificantEventsFacets> => {
    const scopedClients = await getScopedClients({ request });
    const { getEventSearchClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const eventClient = await getEventSearchClient();
    return eventClient.countFacets(await toEventsFilterOptions(params.query ?? {}, scopedClients));
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
    query: z
      .object({
        include_skipped: z
          .enum(['true', 'false'])
          .optional()
          .describe(
            'Also list the detections the classifier closed without the agent, with why. Off by default.'
          ),
      })
      .optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<EventLifecycleResponse> => {
    const { getEventSearchClient, getDetectionClient, licensing } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing });

    const eventClient = await getEventSearchClient();
    const [{ hits: events }, deactivations] = await Promise.all([
      eventClient.findByEventId(params.path.id),
      eventClient.findEventDeactivations(params.path.id),
    ]);
    if (events.length === 0) {
      return { detections: [], events: [] };
    }

    const lifecycleEvents = applyDeactivationReasons(events, deactivations);
    const embedded = collectEmbeddedDetections(events);
    const detectionClient = await getDetectionClient();
    const { hits: allDetectionHits } = await detectionClient.findByIds(
      embedded.map((e) => e.detection_id)
    );
    const hitsByDetectionId = new Map(
      allDetectionHits.filter(hasChangePointType).map((h) => [h.detection_id, h])
    );

    const detections = embedded.flatMap(({ detection_id, rule_name, source_id }) => {
      const hit = hitsByDetectionId.get(detection_id);
      const detection = hit && toLifecycleDetection(hit, { rule_name, source_id });
      return detection ? [detection] : [];
    });

    if (params.query?.include_skipped !== 'true') {
      return { detections, events: lifecycleEvents };
    }

    const skipped = await findSkippedDetections({
      detectionClient,
      eventId: params.path.id,
      known: new Set(detections.map(({ detection_id: id }) => id)),
    });

    return {
      detections: [...detections, ...skipped.detections],
      events: lifecycleEvents,
      ...(skipped.truncated ? { skipped_truncated: true } : {}),
    };
  },
});

/** Used by the managed investigation-completed subscriber workflow. */
const eventsAttachInvestigationRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/events/{id}/investigations',
  options: {
    access: 'internal',
    summary: 'Attach investigation to event',
    description: 'Record a completed or failed investigation against a significant event.',
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
    body: significantEventInvestigationSchema.required({ completed_at: true }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const { getEventSearchClient, getAlertEventsClient, emitTrigger, licensing } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    return attachInvestigationToEvent({
      eventSearchClient: await getEventSearchClient(),
      eventId: params.path.id,
      investigation: params.body,
      alertEventsClient: await getAlertEventsClient(),
      emitTrigger,
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
      'Starts the managed investigation workflow for the given significant event, records the running investigation, and returns the workflow execution id.',
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
    const { getEventSearchClient, getAlertEventsClient, emitTrigger, licensing } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const eventClient = await getEventSearchClient();
    const latest = await eventClient.findLatestByEventId(params.path.id);
    if (!latest) {
      throw notFound(`Significant event "${params.path.id}" not found.`);
    }

    const executionId = await triggerInvestigationWorkflow({
      nightshiftInvestigations: server.nightshiftInvestigations,
      request,
      logger,
      // Latest version, not the first — a caller-supplied id must never pin the workflow to a
      // stale revision.
      event: latest,
    });

    if (!executionId) {
      throw serverUnavailable(
        'Investigation workflow is not available. Ensure workflows management is enabled and Kibana has finished installing managed workflows.'
      );
    }

    try {
      await attachInvestigationToEvent({
        eventSearchClient: eventClient,
        eventId: params.path.id,
        investigation: {
          workflow_execution_id: executionId,
          started_at: new Date().toISOString(),
        },
        alertEventsClient: await getAlertEventsClient(),
        emitTrigger,
        logger,
      });
    } catch (error) {
      // The investigation already started, so a failed attachment must not fail the request.
      logger.warn(
        `Could not attach running investigation to event "${params.path.id}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return { executionId };
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
    body: z.object({
      status: significantEventManualStatusSchema,
      assessment_note: z.string().max(MAX_TEXT_LENGTH).optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server, logger }) => {
    const { getEventSearchClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    return (await getEventSearchClient()).updateEventStatus({
      eventId: params.path.id,
      change: StatusChange.byOperator(params.body.status),
      assessmentNote: params.body.assessment_note,
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
    const { getEventSearchClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const { rulesClient } = await scopedClients.getSignificantEventsAlertingContext();

    return cleanupStaleEvents({
      eventSearchClient: await getEventSearchClient(),
      rulesClient,
      candidateRuleIds: params?.body?.candidateRuleIds,
    });
  },
});

const investigationStatusesRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/investigations/_status',
  options: {
    access: 'internal',
    summary: 'Resolve the outcome of investigation runs',
    description:
      'Reports whether each investigation is pending (an agent works on it) or complete, from the shared investigations API. The ids are the investigation ids a significant event records in `workflow_execution_id`. Investigations that do not exist or cannot be read are omitted.',
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
  }): Promise<{ statuses: Record<string, InvestigationRunStatus> }> => {
    const { licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const statuses = await resolveInvestigationStatuses({
      request,
      agenticInvestigations: server.agenticInvestigations,
      investigationIds: params.body.workflow_execution_ids,
      logger,
    });

    return { statuses };
  },
});

export const internalEventsRoutes = {
  ...eventsSearchRoute,
  ...eventsFacetsRoute,
  ...eventsLifecycleRoute,
  ...eventsAttachInvestigationRoute,
  ...eventsTriggerInvestigationRoute,
  ...eventsUpdateRoute,
  ...cleanupStaleEventsRoute,
  ...investigationStatusesRoute,
};
