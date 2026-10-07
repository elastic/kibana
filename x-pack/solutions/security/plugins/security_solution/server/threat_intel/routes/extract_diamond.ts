/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_REASONING_INFERENCE_FEATURE_ID } from '@kbn/alertzero-common';
import {
  EXTRACT_DIAMOND_API_PATH,
  extractDiamondBodySchema,
  extractDiamondResponseSchema,
  EXTRACT_DIAMOND_MAX_BODY_BYTES,
} from '../../../common/threat_intel';
import { extractDiamond } from '../services';
import { resolveScopedModel } from './lib/scoped_model';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import type { RouteRegistrationDeps } from '.';

export const registerExtractDiamondRoute = ({
  router,
  logger,
  getInference,
  getSearchInferenceEndpoints,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: EXTRACT_DIAMOND_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: EXTRACT_DIAMOND_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: extractDiamondBodySchema },
          response: { 200: { body: () => extractDiamondResponseSchema } },
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
          const result = await extractDiamond(modelOutcome.model, logger, {
            text: request.body.text,
            report_id: request.body.report_id,
          });
          return response.ok({ body: result });
        } catch (err) {
          logger.warn(`extract_diamond failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message:
                `Diamond extraction failed: ${(err as Error).message}. ` +
                `Verify a default GenAI connector is configured.`,
            },
          });
        }
      }
    );
};
