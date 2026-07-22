/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CLASSIFY_SEVERITY_API_PATH,
  DIAMOND_GATE_CONNECTOR_SETTING_KEY,
  THREAT_CATEGORIES,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
  type ThreatCategory,
} from '../../../common/threat_intelligence/hub';
import { classifySeverity } from '../services';
import { resolveScopedModel } from './lib/scoped_model';
import type { RouteRegistrationDeps } from '.';

const enumLiterals = <T extends string>(values: readonly T[]): string => values.join(', ');

const classifySeverityBodySchema = schema.object({
  text: schema.string({ minLength: 1 }),
  report_id: schema.maybe(schema.string({ minLength: 1 })),
  title: schema.maybe(schema.string()),
  categories: schema.maybe(
    schema.arrayOf(
      schema.string({
        validate: (value) =>
          (THREAT_CATEGORIES as readonly string[]).includes(value)
            ? undefined
            : `must be one of: ${enumLiterals(THREAT_CATEGORIES)}`,
      })
    )
  ),
  ioc_count: schema.maybe(schema.number({ min: 0, max: 100_000 })),
});

const CLASSIFY_SEVERITY_MAX_BODY_BYTES = 10 * 1024 * 1024;

/**
 * Route for the `classify_severity` stage of `enrich_threat_report`.
 *
 * Uses `DIAMOND_GATE_CONNECTOR_SETTING_KEY` (same cheap gate connector as
 * taxonomy / assess_relevance). Missing inference or LLM failure returns
 * 5xx (not a fake medium classification) so the enrich workflow can leave
 * ingest severity untouched and keep the report `pending` for retry.
 */
export const registerClassifySeverityRoute = ({
  router,
  logger,
  getInference,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: CLASSIFY_SEVERITY_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.read],
        },
      },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: CLASSIFY_SEVERITY_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: { request: { body: classifySeverityBodySchema } },
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
          const result = await classifySeverity(modelOutcome.model, logger, {
            text: request.body.text,
            report_id: request.body.report_id,
            title: request.body.title,
            categories: request.body.categories as ThreatCategory[] | undefined,
            ioc_count: request.body.ioc_count,
          });
          return response.ok({ body: result });
        } catch (err) {
          logger.warn(`classify_severity failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message:
                `Severity classification failed: ${(err as Error).message}. ` +
                `Verify a default GenAI connector is configured.`,
            },
          });
        }
      }
    );
};
