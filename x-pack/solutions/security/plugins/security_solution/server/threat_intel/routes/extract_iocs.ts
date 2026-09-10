/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { EXTRACT_IOCS_API_PATH } from '../../../common/threat_intel';
import { extractIocs } from '../services';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import type { RouteRegistrationDeps } from '.';

const extractIocsBodySchema = schema.object({
  // Bounded plain text only. Callers pass `content.body_text`; no HTML is accepted
  // or converted here.
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
  defang: schema.maybe(schema.boolean()),
});

// Bounded plain-text bodies can exceed Kibana's default 1 MiB cap; 10 MiB matches other large-text internal routes.
const EXTRACT_IOCS_MAX_BODY_BYTES = 10 * 1024 * 1024;

/**
 * Public route for the `extract_iocs` domain action.
 *
 * Pure regex-based extraction — no I/O, no LLM. enrich_threat_report also calls
 * the same `extractIocs` service directly during automated ingestion.
 */
export const registerExtractIocsRoute = ({ router, logger }: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: EXTRACT_IOCS_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: EXTRACT_IOCS_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: extractIocsBodySchema } },
      },
      async (_context, request, response) => {
        try {
          const result = extractIocs({
            text: request.body.text,
            defang: request.body.defang,
          });
          return response.ok({ body: result });
        } catch (err) {
          logger.warn(`extract_iocs failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to extract IOCs: ${(err as Error).message}` },
          });
        }
      }
    );
};
