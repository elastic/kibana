/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTRIBUTE_ALERTS_EVIDENCE_API_PATH,
  ATTRIBUTE_ALERTS_EVIDENCE_MAX_BODY_BYTES,
  attributeAlertsEvidenceBodySchema,
  attributeAlertsEvidenceResponseSchema,
} from '../../../common/threat_intel';
import { writeAttributionEvidence } from '../services';
import { resolveCurrentSpaceId } from '../lib/space_filter';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import { rejectUntilBootstrapped } from './lib/bootstrap_ready';
import type { RouteRegistrationDeps } from '.';

/**
 * Stamps alert-attribution counts (`alert_hits` / `alert_hits_total`) on a threat report, called
 * by `attribute_alerts_to_reports.yaml`. Internal route so the write runs as the internal user:
 * `.kibana-threat-reports` is plugin-owned and hidden, and Kibana feature privileges grant no
 * Elasticsearch privileges on it, so `asCurrentUser` fails for every non-superuser (same rule
 * `create_threat_report` follows for the same index). The counts themselves are computed by the
 * calling workflow, which already ran the searches as the enabling user against indices that
 * user's own privileges cover (`.alerts-security.alerts-*`); this route only performs the write.
 */
export const registerAttributeAlertsEvidenceRoute = ({
  router,
  logger,
  getSpacesService,
  getBootstrapReady,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: ATTRIBUTE_ALERTS_EVIDENCE_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: ATTRIBUTE_ALERTS_EVIDENCE_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: attributeAlertsEvidenceBodySchema },
          response: { 200: { body: () => attributeAlertsEvidenceResponseSchema } },
        },
      },
      async (context, request, response) => {
        const notReady = await rejectUntilBootstrapped(getBootstrapReady, response);
        if (notReady) return notReady;

        const core = await context.core;
        const esClient = core.elasticsearch.client.asInternalUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        try {
          await writeAttributionEvidence(esClient, {
            index: request.body.index,
            id: request.body.id,
            spaceId,
            window: request.body.window,
            computedAt: request.body.computedAt,
            iocMatchHits: request.body.iocMatchHits,
            techniqueOverlapHits: request.body.techniqueOverlapHits,
            alertHitsTotal: request.body.alertHitsTotal,
          });
          return response.ok({ body: { acknowledged: true } });
        } catch (err) {
          logger.warn(`attribute_alerts_evidence failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to write alert-attribution evidence: ${(err as Error).message}`,
            },
          });
        }
      }
    );
};
