/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  ASSESS_RELEVANCE_API_PATH,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
  DIAMOND_GATE_CONNECTOR_SETTING_KEY,
} from '../../../common/threat_intelligence/hub';
import { assessRelevance } from '../services';
import { resolveScopedModel } from './lib/scoped_model';
import type { RouteRegistrationDeps } from '.';

const assessRelevanceBodySchema = schema.object({
  url: schema.maybe(schema.string({ minLength: 1 })),
  title: schema.maybe(schema.string()),
  text: schema.string({ minLength: 1 }),
  html: schema.maybe(schema.string()),
});

const ASSESS_RELEVANCE_MAX_BODY_BYTES = 10 * 1024 * 1024;

/**
 * Route for the relevance/evidence gate (Slice 1).
 *
 * Given a report's URL, title, and body text, returns a structured
 * classification: whether the article is real threat intel, its quality
 * class (intel / marketing / rollup / thought_leadership), its evidence tier
 * tier (primary / pointer / mixed), whether the fetch appears to have failed
 * (needs_render), any upstream primary sources it points to, and a one-line
 * reason string for observability.
 *
 * Uses DIAMOND_GATE_CONNECTOR_SETTING_KEY so the gate stays on Haiku
 * independently of the heavier extract_diamond step.
 */
export const registerAssessRelevanceRoute = ({
  router,
  logger,
  getInference,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: ASSESS_RELEVANCE_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.read],
        },
      },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: ASSESS_RELEVANCE_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: { request: { body: assessRelevanceBodySchema } },
      },
      async (context, request, response) => {
        const core = await context.core;

        let connectorIdOverride: string | undefined;
        try {
          const setting = await core.uiSettings.client.get<string>(
            DIAMOND_GATE_CONNECTOR_SETTING_KEY
          );
          if (setting) connectorIdOverride = setting;
        } catch {
          // Setting not registered in this context — fall through to default.
        }

        const modelOutcome = await resolveScopedModel({
          inference: getInference(),
          request,
          uiSettingsClient: core.uiSettings.client,
          connectorIdOverride,
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
