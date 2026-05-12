/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import {
  SEVERITY_LEVELS,
  SUBMIT_SUBSCRIPTION_API_PATH,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
  type SeverityLevel,
} from '../../common';
import { persistSubscription } from '../agent_builder/tools';

const submitBodySchema = schema.object({
  tags: schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
  severity_threshold: schema.string({
    validate: (value) =>
      (SEVERITY_LEVELS as readonly string[]).includes(value)
        ? undefined
        : `severity_threshold must be one of: ${SEVERITY_LEVELS.join(', ')}`,
  }),
  schedule_rrule: schema.string({ minLength: 1 }),
  delivery: schema.object({
    type: schema.oneOf([schema.literal('email'), schema.literal('slack')]),
    target: schema.string({ minLength: 1 }),
    connector_id: schema.maybe(schema.string({ minLength: 1 })),
  }),
  template_id: schema.maybe(schema.string({ minLength: 1 })),
});

/**
 * Internal route used by the interactive subscription-confirmation
 * attachment. Posting here bypasses a second agent round-trip — the form
 * submits values directly to this endpoint, which delegates to the same
 * `persistSubscription` helper that backs `manage_subscriptions` with
 * `action="create"` + `confirm=true`. Keeping a single helper means the
 * two paths can't drift.
 *
 * Authorization gates on `threatIntelligence_write_subscriptions` so the
 * three-tier (read / write / admin) privilege model is honored at the
 * HTTP boundary; the underlying ES write still runs as the current user
 * so role-based document/field-level rules also apply.
 */
export const registerSubmitSubscriptionRoute = (router: IRouter, logger: Logger): void => {
  router.versioned
    .post({
      path: SUBMIT_SUBSCRIPTION_API_PATH,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.writeSubscriptions],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: submitBodySchema,
          },
        },
      },
      async (context, request, response) => {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        try {
          const result = await persistSubscription(esClient, {
            tags: request.body.tags,
            // The schema-level validate guarantees this is a valid SeverityLevel; the
            // narrower type is enforced at runtime via the validator above.
            severity_threshold: request.body.severity_threshold as SeverityLevel,
            schedule_rrule: request.body.schedule_rrule,
            delivery: request.body.delivery,
            template_id: request.body.template_id,
          });
          return response.ok({
            body: {
              status: 'created',
              subscription_id: result.subscription_id,
              human_summary: result.human_summary,
              template_id: request.body.template_id,
            },
          });
        } catch (err) {
          logger.warn(`submit_subscription failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to persist subscription: ${(err as Error).message}` },
          });
        }
      }
    );
};
