/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { EXTRACT_IOCS_API_PATH, THREAT_INTELLIGENCE_API_PRIVILEGES } from '../../common';
import { extractIocs } from '../services';
import type { RouteRegistrationDeps } from '.';

const extractIocsBodySchema = schema.object({
  text: schema.string({ minLength: 1 }),
  defang: schema.maybe(schema.boolean()),
});

/**
 * Internal route for the `extract_iocs` domain action.
 *
 * Pure regex-based extraction — no I/O, no LLM. Workflow 2 also calls
 * the same `extractIocs` service directly during automated ingestion.
 */
export const registerExtractIocsRoute = ({ router, logger }: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: EXTRACT_IOCS_API_PATH,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.read],
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
