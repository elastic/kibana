/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INGEST_THREAT_REPORT_API_PATH,
  CREATE_THREAT_REPORT_MAX_BODY_BYTES,
  ingestThreatReportBodySchema,
  ingestThreatReportResponseSchema,
} from '../../../common/threat_intel';
import { ingestThreatReport } from '../services';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import { rejectUntilBootstrapped } from './lib/bootstrap_ready';
import type { RouteRegistrationDeps } from '.';

/**
 * Writes one fetched-feed report, called by `ingest_threat_feeds.yaml` after its own dedup
 * check. Internal route so the write runs as the internal user: `.kibana-threat-reports` is
 * plugin-owned and hidden, and Kibana feature privileges grant no Elasticsearch privileges on it,
 * so `asCurrentUser` fails for every non-superuser (same rule `create_threat_report` follows for
 * the same index).
 */
export const registerIngestThreatReportRoute = ({
  router,
  logger,
  getBootstrapReady,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: INGEST_THREAT_REPORT_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
      options: {
        body: {
          accepts: ['application/json'],
          // Shares create_threat_report's cap: fetched-feed report bodies can be large.
          maxBytes: CREATE_THREAT_REPORT_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: ingestThreatReportBodySchema },
          response: { 200: { body: () => ingestThreatReportResponseSchema } },
        },
      },
      async (context, request, response) => {
        const notReady = await rejectUntilBootstrapped(getBootstrapReady, response);
        if (notReady) return notReady;

        const core = await context.core;
        const esClient = core.elasticsearch.client.asInternalUser;
        try {
          const result = await ingestThreatReport(esClient, request.body.document);
          return response.ok({ body: result });
        } catch (err) {
          logger.warn(`ingest_threat_report failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to ingest threat report: ${(err as Error).message}` },
          });
        }
      }
    );
};
