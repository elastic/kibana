/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

const MAX_ALERT_FIELD_LENGTH = 500;
const MAX_EXECUTION_ID_LENGTH = 256;

export const findAlertRecoveredInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations/_alert_recovered',
  options: {
    access: 'internal',
    summary: 'Find an open investigation for a recovered alert',
    description:
      'Finds an open investigation holding the recovered alert by its `alert` subject (`alert_uuid`), ' +
      'deduplicates at-least-once deliveries on the subject, and composes the recovery follow-up prompt.',
  },
  security: { authz: { requiredPrivileges: ['agentBuilder:write'] } },
  params: z.object({
    body: z.object({
      alert_uuid: z.string().min(1).max(MAX_ALERT_FIELD_LENGTH),
      alert_id: z.string().min(1).max(MAX_ALERT_FIELD_LENGTH),
      alert_start: z.string().max(100).nullable().optional(),
      rule_id: z.string().min(1).max(MAX_ALERT_FIELD_LENGTH),
      rule_name: z.string().min(1).max(MAX_ALERT_FIELD_LENGTH),
      rule_type_id: z.string().min(1).max(MAX_ALERT_FIELD_LENGTH),
      rule_tags: z.array(z.string().max(MAX_ALERT_FIELD_LENGTH)).max(50).optional(),
      execution_id: z.string().min(1).max(MAX_EXECUTION_ID_LENGTH),
      release_event: z.boolean().optional(),
    }),
  }),
  handler: async ({ request, params: { body }, getInvestigationsClient }) => {
    try {
      return (
        (await getInvestigationsClient(request).findAlertRecovered({
          alertUuid: body.alert_uuid,
          alertId: body.alert_id,
          alertStart: body.alert_start,
          ruleId: body.rule_id,
          ruleName: body.rule_name,
          ruleTypeId: body.rule_type_id,
          ruleTags: body.rule_tags,
          executionId: body.execution_id,
          ...(body.release_event && { releaseEvent: body.release_event }),
        })) ?? {}
      );
    } catch (error) {
      rethrowInvestigationClientError(error);
    }
  },
});
