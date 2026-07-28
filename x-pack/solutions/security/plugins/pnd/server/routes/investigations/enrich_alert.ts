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
// Elastic Defend behavior/malware alerts (e.g. ransomware_detected) land here,
// NOT in the detection-engine index. The Watch Floor demo starts from a Defend
// alert, so we search both and normalize the two field conventions.
const DEFEND_ALERTS_INDEX = 'logs-endpoint.alerts-default';
const ALERT_INDICES = `${DETECTION_ALERTS_INDEX},${DEFEND_ALERTS_INDEX}`;

interface AlertSource {
  // Detection-engine convention
  'kibana.alert.rule.name'?: string;
  'kibana.alert.severity'?: string;
  'kibana.alert.reason'?: string;
  'kibana.alert.rule.threat'?: Array<{ technique?: Array<{ id?: string }> }>;
  // Elastic Defend behavior-alert convention
  rule?: { name?: string };
  event?: { action?: string; severity?: number };
  host?: { name?: string };
  message?: string;
}

const EnrichAlertRequestBody = z.object({
  alertId: z.string().optional(),
  investigationId: z.string().optional(),
});

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
            index: ALERT_INDICES,
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

          // Normalize across detection-engine and Elastic Defend alert shapes.
          const ruleName = src['kibana.alert.rule.name'] ?? src.rule?.name ?? 'Unknown rule';
          const summary =
            src['kibana.alert.reason'] ?? src.message ?? src.event?.action ?? 'Security alert';
          const severity =
            src['kibana.alert.severity'] ??
            (src.event?.severity != null ? String(src.event.severity) : 'medium');

          return response.ok({
            body: {
              enriched: true,
              alertId,
              investigationId,
              ruleName,
              severity,
              summary,
              host: src.host?.name,
              action: src.event?.action,
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
