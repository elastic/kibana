/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  EXTRACT_DIAMOND_API_PATH,
  THREAT_INTEL_DIAMOND_INFERENCE_FEATURE_ID,
} from '../../../common/threat_intel';
import { extractDiamond } from '../services';
import { resolveScopedModel } from './lib/scoped_model';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import type { RouteRegistrationDeps } from '.';

const extractDiamondBodySchema = schema.object({
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
  report_id: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
});

const EXTRACT_DIAMOND_MAX_BODY_BYTES = 10 * 1024 * 1024;

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
        validate: { request: { body: extractDiamondBodySchema } },
      },
      async (context, request, response) => {
        const core = await context.core;

        const modelOutcome = await resolveScopedModel({
          inference: getInference(),
          searchInferenceEndpoints: getSearchInferenceEndpoints(),
          request,
          uiSettingsClient: core.uiSettings.client,
          featureId: THREAT_INTEL_DIAMOND_INFERENCE_FEATURE_ID,
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
