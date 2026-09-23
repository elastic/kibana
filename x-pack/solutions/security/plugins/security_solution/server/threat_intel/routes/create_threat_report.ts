/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CREATE_THREAT_REPORT_API_PATH,
  MAX_URL_LENGTH,
  SEVERITY_LEVELS,
  type SeverityLevel,
} from '../../../common/threat_intel';
import { createThreatReport } from '../services';
import { resolveCurrentSpaceId } from '../lib/space_filter';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import { rejectUntilBootstrapped } from './lib/bootstrap_ready';
import type { RouteRegistrationDeps } from '.';

// A large bounded plain-text body can exceed Kibana's default 1 MiB body cap.
// Match the same ceiling used by the extract_iocs route.
const CREATE_THREAT_REPORT_MAX_BODY_BYTES = 10 * 1024 * 1024;

const createThreatReportBodySchema = schema.object({
  title: schema.string({ minLength: 1, maxLength: 1024 }),
  body_text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
  source_name: schema.string({ minLength: 1, maxLength: 256 }),
  // Provenance only. Stored as metadata on the supplied report; it is never
  // fetched. Kibana does not turn this URL into a report.
  source_url: schema.maybe(
    schema.uri({
      scheme: ['http', 'https'],
      validate: (value) =>
        value.length > MAX_URL_LENGTH ? `must be ${MAX_URL_LENGTH} characters or fewer` : undefined,
    })
  ),
  severity: schema.maybe(
    schema.string({
      maxLength: 32,
      validate: (value) =>
        (SEVERITY_LEVELS as readonly string[]).includes(value)
          ? undefined
          : `must be one of: ${SEVERITY_LEVELS.join(', ')}`,
    })
  ),
  language: schema.maybe(schema.string({ maxLength: 32 })),
});

/**
 * Internal route for the `create_threat_report` domain action — the canonical
 * execution surface for bounded analyst-paste ingestion. `source_url` is optional
 * provenance metadata only; the route never fetches it.
 */
export const registerCreateThreatReportRoute = ({
  router,
  logger,
  getSpacesService,
  getBootstrapReady,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: CREATE_THREAT_REPORT_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: CREATE_THREAT_REPORT_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: createThreatReportBodySchema } },
      },
      async (context, request, response) => {
        const notReady = await rejectUntilBootstrapped(getBootstrapReady, response);
        if (notReady) return notReady;

        const core = await context.core;
        // Internal user: these are plugin-owned hidden indices, and Kibana
        // feature privileges (securitySolution / RULES_API_ALL) do not grant
        // Elasticsearch privileges on them, so asCurrentUser failed for every
        // non-superuser. Access is already gated by route authz above and
        // narrowed by the explicit space filter below.
        const esClient = core.elasticsearch.client.asInternalUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        try {
          const result = await createThreatReport(esClient, logger, spaceId, {
            title: request.body.title,
            body_text: request.body.body_text,
            source_name: request.body.source_name,
            source_url: request.body.source_url,
            severity: request.body.severity as SeverityLevel | undefined,
            language: request.body.language,
          });
          return response.ok({ body: result });
        } catch (err) {
          logger.warn(`create_threat_report failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to create threat report: ${(err as Error).message}` },
          });
        }
      }
    );
};
