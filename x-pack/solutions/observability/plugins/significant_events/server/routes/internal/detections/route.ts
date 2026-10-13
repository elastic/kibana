/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ID_LENGTH,
  MAX_RULE_NAME_LENGTH,
  type Detection,
} from '@kbn/significant-events-schema';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { DetectionClient, StoredDetection } from '../../../lib/significant_events/detections';
import type { PaginatedResponse } from '../../../lib/significant_events/query_utils';
import { createServerRoute } from '../../create_server_route';
import { assertNotPaused } from '../../utils/assert_not_paused';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

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
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
      page: z.coerce.number().int().min(1).optional(),
      perPage: z.coerce.number().int().min(1).max(1000).optional(),
      rule_uuid: z
        .union([
          z
            .string()
            .max(MAX_ID_LENGTH)
            .transform((value) => [value]),
          z.array(z.string().max(MAX_ID_LENGTH)),
        ])
        .optional(),
      rule_name: z.string().max(MAX_RULE_NAME_LENGTH).optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<PaginatedResponse<Detection>> => {
    const { getDetectionClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const detectionClient = await getDetectionClient();
    return detectionClient.findLatestPaginated(params.query);
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

    const { detection_ids: detectionIds, processed_by: processedBy } = params.body;
    return appendDetectionDocuments({
      getDetectionClient,
      documents: detectionIds.map((detectionId) => ({
        detection_id: detectionId,
        processed_by: processedBy,
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
  ...detectionsHistoryRoute,
  ...createDetectionsRoute,
  ...markDetectionsProcessedRoute,
  ...markRulesScannedRoute,
};
