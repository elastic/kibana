/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  ENRICH_REPORT_CORE_API_PATH,
  THREAT_INTEL_ENRICH_INFERENCE_FEATURE_ID,
} from '../../../common/threat_intel';
import type { ExtractedIoc } from '../services/extract_iocs';
import { enrichReportCore } from '../services';
import { resolveScopedModel } from './lib/scoped_model';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import type { RouteRegistrationDeps } from '.';

const iocSchema = schema.object({
  type: schema.string({ minLength: 1, maxLength: 32 }),
  value: schema.string({ minLength: 1, maxLength: 32_768 }),
  defanged: schema.maybe(schema.string({ maxLength: 32_768 })),
  tier: schema.string({ minLength: 1, maxLength: 32 }),
  tier_heuristic: schema.string({ minLength: 1, maxLength: 32 }),
  tier_basis: schema.string({ minLength: 1, maxLength: 256 }),
  port: schema.maybe(schema.number({ min: 1, max: 65_535 })),
});

const bodySchema = schema.object({
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
  iocs: schema.arrayOf(iocSchema, { maxSize: 5_000 }),
  title: schema.maybe(schema.string({ maxLength: 1_024 })),
  article_url: schema.maybe(schema.string({ maxLength: 32_768 })),
  report_id: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
  truncated: schema.maybe(schema.boolean()),
});

export const registerEnrichReportCoreRoute = ({
  router,
  logger,
  getInference,
  getSearchInferenceEndpoints,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: ENRICH_REPORT_CORE_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: 10 * 1024 * 1024,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: bodySchema } },
      },
      async (context, request, response) => {
        const core = await context.core;
        const modelOutcome = await resolveScopedModel({
          inference: getInference(),
          searchInferenceEndpoints: getSearchInferenceEndpoints(),
          request,
          uiSettingsClient: core.uiSettings.client,
          featureId: THREAT_INTEL_ENRICH_INFERENCE_FEATURE_ID,
          logger,
        });
        if (!modelOutcome.ok) {
          return response.customError({
            statusCode: modelOutcome.reason === 'no_inference_plugin' ? 503 : 400,
            body: { message: modelOutcome.message },
          });
        }

        try {
          return response.ok({
            body: await enrichReportCore(modelOutcome.model, logger, {
              ...request.body,
              iocs: request.body.iocs as ExtractedIoc[],
            }),
          });
        } catch (error) {
          logger.warn(`enrich_report_core failed: ${(error as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message:
                `Core threat-intel enrichment failed: ${(error as Error).message}. ` +
                `Verify the Sonnet model setting is configured.`,
            },
          });
        }
      }
    );
};
