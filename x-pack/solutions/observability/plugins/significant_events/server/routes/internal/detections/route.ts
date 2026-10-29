/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHANGE_POINT_TYPES,
  skipMarkerSchema,
  MAX_ID_LENGTH,
  MAX_RULE_NAME_LENGTH,
  type Detection,
} from '@kbn/significant-events-schema';
import { badRequest, notFound } from '@hapi/boom';
import { z, isoDateTime } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { DetectionClient, StoredDetection } from '../../../lib/significant_events/detections';
import { filterQueryLinksByEntity } from '../../../lib/significant_events/entities/filter_query_links_by_entity';
import { getLiveEntities } from '../../../lib/significant_events/entities/get_live_entities';
import type { PaginatedResponse } from '../../../lib/significant_events/query_utils';
import { createServerRoute } from '../../create_server_route';
import { assertNotPaused } from '../../utils/assert_not_paused';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { filterReadableSourceIds } from '../../utils/resolve_source_ids';
import { listAllSources } from '../../utils/list_all_sources';

const MAX_DETECTION_ENTITY_IDS = 100;
const MAX_DETECTION_RULE_UUIDS = 1000;

const detectionsSearchRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/detections',
  options: {
    access: 'internal',
    summary: 'Get latest detections',
    description: 'Search detection entities using their latest derived state with pagination.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      from: isoDateTime().optional(),
      to: isoDateTime().optional(),
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(1000).optional(),
      rule_uuid: z
        .union([
          z
            .string()
            .max(MAX_ID_LENGTH)
            .transform((value) => [value]),
          z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_DETECTION_RULE_UUIDS),
        ])
        .optional(),
      rule_name: z.string().max(MAX_RULE_NAME_LENGTH).optional(),
      search: z.string().max(MAX_RULE_NAME_LENGTH).optional(),
      change_point_type: z
        .union([
          z.enum(CHANGE_POINT_TYPES).transform((value) => [value]),
          z.array(z.enum(CHANGE_POINT_TYPES)).max(CHANGE_POINT_TYPES.length),
        ])
        .optional(),
      entityIds: z
        .union([
          z
            .string()
            .min(1)
            .max(MAX_ID_LENGTH)
            .transform((id) => [id]),
          z.array(z.string().min(1).max(MAX_ID_LENGTH)).max(MAX_DETECTION_ENTITY_IDS),
        ])
        .optional(),
      unassignedEntities: BooleanFromString.optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<PaginatedResponse<Detection>> => {
    const scopedClients = await getScopedClients({ request });
    const { getDetectionClient, licensing, sourcesClient } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const detectionClient = await getDetectionClient();
    const { entityIds, unassignedEntities, ...searchOptions } = params.query ?? {};
    if (!entityIds?.length && !unassignedEntities) {
      return detectionClient.findLatestPaginated(searchOptions);
    }

    const sources = await listAllSources(sourcesClient);
    const sourceIds = await filterReadableSourceIds(
      sources.map(({ id }) => id),
      sourcesClient
    );
    const knowledgeIndicatorClient = await scopedClients.getKnowledgeIndicatorClient();
    const queryLinks = await filterQueryLinksByEntity(
      await knowledgeIndicatorClient.getQueryLinks(sourceIds, { ruleUnbacked: 'exclude' }),
      { entityIds, unassignedEntities },
      () => getLiveEntities(knowledgeIndicatorClient, sourceIds)
    );
    const selectedRuleIds = new Set(queryLinks.map(({ rule_id: ruleId }) => ruleId));
    const ruleUuids = searchOptions.rule_uuid
      ? searchOptions.rule_uuid.filter((ruleUuid) => selectedRuleIds.has(ruleUuid))
      : [...selectedRuleIds];

    if (ruleUuids.length > MAX_DETECTION_RULE_UUIDS) {
      throw badRequest(
        `Entity filter matches more than ${MAX_DETECTION_RULE_UUIDS} rules. Narrow the entity selection.`
      );
    }

    if (ruleUuids.length === 0) {
      return {
        hits: [],
        page: searchOptions.page ?? 1,
        perPage: searchOptions.perPage ?? 25,
        total: 0,
      };
    }

    return detectionClient.findLatestPaginated({ ...searchOptions, rule_uuid: ruleUuids });
  },
});

const detectionByIdRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/detections/{id}',
  options: {
    access: 'internal',
    summary: 'Get a detection',
    description: 'Get the newest detection document with the requested detection id.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_ID_LENGTH),
    }),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<Detection> => {
    const { getDetectionClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const detectionClient = await getDetectionClient();
    const detection = (await detectionClient.findById(params.path.id)).hits.at(-1);
    if (!detection) {
      throw notFound(`Detection "${params.path.id}" not found.`);
    }
    return detection;
  },
});

const detectionsHistoryRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/detections/{id}/history',
  options: {
    access: 'internal',
    summary: 'Get a rule change-point history',
    description:
      "Get a rule's change-point detections (keyed by rule_uuid, path `{id}` = rule_uuid), sorted ascending.",
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
  }): Promise<{ hits: Detection[] }> => {
    const { getDetectionClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const detectionClient = await getDetectionClient();
    return detectionClient.findHistoryByRuleUuid(params.path.id);
  },
});

// Bounds one request; a Detection run writes at most one document per scanned rule.
const MAX_DETECTIONS_PER_REQUEST = 1000;

const createDetectionSchema = z.object({
  detection_id: z.string().max(MAX_ID_LENGTH),
  rule_uuid: z.string().max(MAX_ID_LENGTH),
  rule_name: z.string().max(MAX_RULE_NAME_LENGTH).optional(),
  source_id: z.string().max(MAX_ID_LENGTH).optional(),
  // Not narrowed to CHANGE_POINT_TYPES: Elasticsearch can also report `indeterminable`,
  // which the Detection workflow persists like any other non-stationary observation.
  change_point_type: z.string().min(1).max(64),
  p_value: z.number(),
  severity_score: z.number().min(0).max(100).optional(),
  alert_index: z.string().max(MAX_ID_LENGTH).optional(),
  workflow_execution_id: z.string().max(MAX_ID_LENGTH).optional(),
});

/** Stamps server-side `@timestamp` and appends to the current space; Kibana writes as its internal user. */
const appendDetectionDocuments = async ({
  getDetectionClient,
  documents,
}: {
  getDetectionClient: () => Promise<DetectionClient>;
  documents: Array<Omit<StoredDetection, '@timestamp'>>;
}): Promise<{ count: number }> => {
  const timestamp = new Date().toISOString();
  const detectionClient = await getDetectionClient();
  await detectionClient.bulkCreate(
    documents.map((document) => ({ '@timestamp': timestamp, ...document }))
  );
  return { count: documents.length };
};

const createDetectionsRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/detections',
  options: {
    access: 'internal',
    summary: 'Create detections',
    description:
      'Appends change-point detections to the current space. Detections are immutable; `@timestamp` is set by the server. Kibana writes as its internal user, so callers need the Nightshift manage privilege but no Elasticsearch privileges on the data stream. Rejected with 409 while Significant Events is paused.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      detections: z.array(createDetectionSchema).min(1).max(MAX_DETECTIONS_PER_REQUEST),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
  }): Promise<{ count: number }> => {
    const { getDetectionClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    return appendDetectionDocuments({ getDetectionClient, documents: params.body.detections });
  },
});

const markDetectionsProcessedRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/detections/_mark_processed',
  options: {
    access: 'internal',
    summary: 'Mark detections as processed',
    description:
      'Records that detections in the current space were processed, which sets their derived `processed` flag. Stored as processed markers in the detections data stream. Rejected with 409 while Significant Events is paused.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      detection_ids: z.array(z.string().max(MAX_ID_LENGTH)).min(1).max(MAX_DETECTIONS_PER_REQUEST),
      processed_by: z.string().max(MAX_ID_LENGTH),
      /** Set when the classifier, not the agent, closed these detections; names the event it rests on. */
      skip: skipMarkerSchema.optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
  }): Promise<{ count: number }> => {
    const { getDetectionClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const { detection_ids: detectionIds, processed_by: processedBy, skip } = params.body;
    return appendDetectionDocuments({
      getDetectionClient,
      documents: detectionIds.map((detectionId) => ({
        detection_id: detectionId,
        processed_by: processedBy,
        ...(skip ? { skip } : {}),
      })),
    });
  },
});

const markRulesScannedRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/detections/_mark_scanned',
  options: {
    access: 'internal',
    summary: 'Mark rules as scanned for detections',
    description:
      'Records that rules in the current space were scanned for change points without a new detection, so scan scheduling treats them as recently covered. Stored as scan markers in the detections data stream. Rejected with 409 while Significant Events is paused.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      rule_uuids: z.array(z.string().max(MAX_ID_LENGTH)).min(1).max(MAX_DETECTIONS_PER_REQUEST),
      scanned_by: z.string().max(MAX_ID_LENGTH),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    maintenanceService,
  }): Promise<{ count: number }> => {
    const { getDetectionClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });
    await assertNotPaused({ maintenanceService, request });

    const { rule_uuids: ruleUuids, scanned_by: scannedBy } = params.body;
    return appendDetectionDocuments({
      getDetectionClient,
      documents: ruleUuids.map((ruleUuid) => ({ rule_uuid: ruleUuid, scanned_by: scannedBy })),
    });
  },
});

export const internalDetectionsRoutes = {
  ...detectionsSearchRoute,
  ...detectionByIdRoute,
  ...detectionsHistoryRoute,
  ...createDetectionsRoute,
  ...markDetectionsProcessedRoute,
  ...markRulesScannedRoute,
};
