/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z, lazySchema } from '@kbn/zod/v4';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { policyIdentifierInputSchema } from '../../../../../common/workflows/step_types/endpoint/policies/input_schemas';
import { createPolicyTool } from './create_policy_tool';
import {
  GET_POLICY_ROLLOUT_STATUS_MAX_RESULT_TOKENS,
  presentPolicyRolloutStatus,
} from '../../../../endpoint/services/policy_management/presentation/present_get_policy_rollout_status';

export const GET_POLICY_ROLLOUT_STATUS_TOOL_ID =
  'security.policy_management.get_policy_rollout_status';

export const getPolicyRolloutStatusSchema = lazySchema(() =>
  z.object({
    idOrName: policyIdentifierInputSchema.describe(
      'Saved-object id or exact endpoint policy name in the current space.'
    ),
  })
);

export const createGetPolicyRolloutStatusTool = ({
  endpointAppContextService,
}: {
  endpointAppContextService: EndpointAppContextService;
}): BuiltinSkillBoundedTool<typeof getPolicyRolloutStatusSchema> =>
  createPolicyTool({
    endpointAppContextService,
    id: GET_POLICY_ROLLOUT_STATUS_TOOL_ID,
    description:
      'Get current assigned-versus-applied rollout status for one Elastic Defend endpoint policy by saved-object id or exact name in the current space. ' +
      'Returns two grouped populations. revision_coverage counts readable united endpoint hosts whose canonical assignment id matches this policy\u2019s current ' +
      'agent-policy ids on the request-scoped CPS/CCS surface and reports out_of_date_hosts at an older revision. current_revision_responses counts latest policy ' +
      'responses for the bounded assignment-matched agents at the current package revision and reports needs_attention_hosts whose actions have failure or warning status. ' +
      'classified_hosts contains only hosts whose result can be decided. ' +
      'For current_revision_responses, undetermined_hosts counts returned latest-response hits with missing or invalid required fields; assignment-matched agents with no response document are not included. ' +
      'For either population, copy undetermined_hosts as returned, including zero; ' +
      'do not convert undetermined_hosts to healthy, out-of-date, failing, or needs-attention counts. ' +
      'response_coverage_incomplete is true when the latest policy-response search did not cover every cluster that contributed United hosts; zero needs_attention_hosts applies only to the assignment-matched agents and available response evidence; ' +
      'copy it as returned, including false. Do not treat zero needs_attention_hosts as complete when response_coverage_incomplete is true. ' +
      'It is not overflow (truncated) and not per-hit invalid evidence (undetermined_hosts). ' +
      'policy.id is the stable value to pass to a later idOrName call. ' +
      'A name accompanied by name_string_truncated: true is display-only and is not an exact stored name. ' +
      'Classified or assignment-matched hosts are not enrolled-agent usage evidence and cannot answer used or unused. ' +
      'The upstream_unclassified_hosts field is unclassified truncation and must not be added or treated as out-of-date, needs-attention, or undetermined hosts. ' +
      'This is a current status read, not rollout planning and not failed-host diagnosis. Does not write policies.',
    schema: getPolicyRolloutStatusSchema,
    maxResultTokens: GET_POLICY_ROLLOUT_STATUS_MAX_RESULT_TOKENS,
    run: async ({ idOrName }: z.infer<typeof getPolicyRolloutStatusSchema>, service) => {
      const status = await service.getPolicyRolloutStatus({ idOrName });
      return presentPolicyRolloutStatus(status);
    },
  });
