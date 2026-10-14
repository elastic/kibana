/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXTRACT_IOCS_API_PATH,
  extractIocsBodySchema,
  extractIocsResponseSchema,
  EXTRACT_IOCS_MAX_BODY_BYTES,
} from '../../../common/threat_intel';
import { extractIocs } from '../services';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import type { RouteRegistrationDeps } from '.';

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
        validate: {
          request: { body: extractIocsBodySchema },
          response: { 200: { body: () => extractIocsResponseSchema } },
        },
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
