/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  ASSESS_RELEVANCE_API_PATH,
  THREAT_INTEL_ENRICH_INFERENCE_FEATURE_ID,
} from '../../../common/threat_intel';
import { assessRelevance } from '../services';
import { resolveScopedModel } from './lib/scoped_model';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import type { RouteRegistrationDeps } from '.';

const assessRelevanceBodySchema = schema.object({
  url: schema.maybe(schema.string({ minLength: 1, maxLength: 2048 })),
  title: schema.maybe(schema.string({ maxLength: 1024 })),
  text: schema.string({ minLength: 1, maxLength: 5_000_000 }),
});

const ASSESS_RELEVANCE_MAX_BODY_BYTES = 10 * 1024 * 1024;

export const registerAssessRelevanceRoute = ({
  router,
  logger,
  getInference,
  getSearchInferenceEndpoints,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: ASSESS_RELEVANCE_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: ASSESS_RELEVANCE_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: assessRelevanceBodySchema } },
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
          const result = await assessRelevance(modelOutcome.model, logger, {
            url: request.body.url,
            title: request.body.title,
            text: request.body.text,
          });
          return response.ok({ body: result });
        } catch (err) {
          logger.warn(`assess_relevance failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message:
                `Relevance assessment failed: ${(err as Error).message}. ` +
                `Verify a default GenAI connector is configured.`,
            },
          });
        }
      }
    );
};
