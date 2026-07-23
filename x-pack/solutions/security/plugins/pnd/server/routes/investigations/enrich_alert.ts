/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATIONS_URL } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

const ENRICH_ALERT_PATH = `${PND_INVESTIGATIONS_URL}/_enrich_alert` as const;

const DETECTION_ALERTS_INDEX = '.alerts-security.alerts-default';

const EnrichAlertRequestBody = z.object({
  alertId: z.string().optional(),
  investigationId: z.string().optional(),
});

interface AlertSource {
  'kibana.alert.rule.name'?: string;
  'kibana.alert.severity'?: string;
  'kibana.alert.reason'?: string;
  'kibana.alert.rule.threat'?: Array<{ technique?: Array<{ id?: string }> }>;
  message?: string;
}

/**
 * Enrich a detection-engine alert into the ground-truth block the Floor Worker's
 * ai.agent Reason step consumes. Reads the real alert document from the
 * detection alerts index. Fail-closed: if there is no alertId or the alert is
 * not found, returns `{ enriched: false, reason }` so the caller stops before
 * triaging an empty context (the Worker's enrich step is on-failure: stop).
 */
export const registerEnrichAlertRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .post({
      path: ENRICH_ALERT_PATH,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Enrich a detection-engine alert for Watch Floor triage',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { body: buildRouteValidationWithZod(EnrichAlertRequestBody) },
        },
      },
      async (context, request, response) => {
        const { alertId, investigationId } = request.body;

        if (alertId == null || alertId.length === 0) {
          return response.ok({
            body: { enriched: false, reason: 'no alertId provided', investigationId },
          });
        }

        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        try {
          const result = await esClient.search<AlertSource>({
            index: DETECTION_ALERTS_INDEX,
            size: 1,
            query: { ids: { values: [alertId] } },
            allow_no_indices: true,
            ignore_unavailable: true,
          });
          const hit = result.hits.hits[0];
          if (hit?._source == null) {
            return response.ok({
              body: { enriched: false, reason: 'alert not found', alertId, investigationId },
            });
          }
          const src = hit._source;
          const tactics = (src['kibana.alert.rule.threat'] ?? [])
            .flatMap((t) => t.technique ?? [])
            .map((tech) => tech.id)
            .filter((id): id is string => id != null);

          return response.ok({
            body: {
              enriched: true,
              alertId,
              investigationId,
              ruleName: src['kibana.alert.rule.name'] ?? 'Unknown rule',
              severity: src['kibana.alert.severity'] ?? 'medium',
              summary: src['kibana.alert.reason'] ?? src.message ?? 'Security alert',
              tactics,
              stanceSignals: [],
            },
          });
        } catch (error) {
          logger.warn(`PND: enrich_alert failed for ${alertId}: ${error?.message}`);
          return response.ok({
            body: { enriched: false, reason: `enrich error: ${error?.message}`, alertId },
          });
        }
      }
    );
};
