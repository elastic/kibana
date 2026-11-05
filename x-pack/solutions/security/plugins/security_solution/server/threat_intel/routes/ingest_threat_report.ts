/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INGEST_THREAT_REPORT_API_PATH,
  CREATE_THREAT_REPORT_MAX_BODY_BYTES,
  GLOBAL_SPACE_ID,
  ingestThreatReportBodySchema,
  ingestThreatReportResponseSchema,
} from '../../../common/threat_intel';
import { ingestThreatReport } from '../services';
import { resolveCurrentSpaceId } from '../lib/space_filter';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import { rejectUntilBootstrapped } from './lib/bootstrap_ready';
import type { RouteRegistrationDeps } from '.';

/**
 * Writes one fetched-feed report, called by `ingest_threat_feeds.yaml` after its own dedup
 * check. Internal route so the write runs as the internal user: `.kibana-threat-reports` is
 * plugin-owned and hidden, and Kibana feature privileges grant no Elasticsearch privileges on it,
 * so `asCurrentUser` fails for every non-superuser (same rule `create_threat_report` follows for
 * the same index).
 *
 * Writing as the internal user means Elasticsearch no longer decides where the new report lands,
 * so the route has to. The adapters stamp each report with its own source's `space_id`, and sources
 * are global-only today, so a legitimate caller supplies either the request's space or the global
 * sentinel; anything else is a caller choosing another space's data, and is rejected. Global stays
 * accepted because feed ingestion needs it -- the ingest workflow runs unprefixed, resolving to the
 * `default` space, while the reports it creates are visible everywhere by design. That leaves
 * "anyone holding this route's privilege in one space can publish a global report" open on purpose;
 * separating it from a space-scoped write needs a privilege that does not exist yet
 * (https://github.com/elastic/security-team/issues/19859).
 */
export const registerIngestThreatReportRoute = ({
  router,
  logger,
  getSpacesService,
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
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const { space_id: requestedSpaceId, ...rest } = request.body.document;

        if (
          requestedSpaceId != null &&
          requestedSpaceId !== spaceId &&
          requestedSpaceId !== GLOBAL_SPACE_ID
        ) {
          return response.badRequest({
            body: {
              message: `Cannot ingest a report into space "${requestedSpaceId}" from space "${spaceId}"`,
            },
          });
        }

        try {
          const result = await ingestThreatReport(esClient, {
            ...rest,
            // An unstamped report is invisible to every space's reads, since those filter on
            // `space_id`. Default to the request's space rather than storing it unreachable.
            space_id: requestedSpaceId ?? spaceId,
          });
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
