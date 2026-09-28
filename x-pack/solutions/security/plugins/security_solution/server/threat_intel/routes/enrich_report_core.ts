/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_REASONING_INFERENCE_FEATURE_ID } from '@kbn/alertzero-common';
import {
  ENRICH_REPORT_CORE_MAX_BODY_BYTES,
  ENRICH_REPORT_CORE_API_PATH,
  enrichReportCoreBodySchema,
  enrichReportCoreResponseSchema,
} from '../../../common/threat_intel';
import { enrichReportCore } from '../services';
import { resolveScopedModel } from './lib/scoped_model';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import type { RouteRegistrationDeps } from '.';

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
          maxBytes: ENRICH_REPORT_CORE_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: enrichReportCoreBodySchema },
          response: { 200: { body: () => enrichReportCoreResponseSchema } },
        },
      },
      async (context, request, response) => {
        const core = await context.core;
        const modelOutcome = await resolveScopedModel({
          inference: getInference(),
          searchInferenceEndpoints: getSearchInferenceEndpoints(),
          request,
          uiSettingsClient: core.uiSettings.client,
          featureId: ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
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
