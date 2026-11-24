/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { type z, lazySchema } from '@kbn/zod/v4';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { createPolicyTool } from './create_policy_tool';
import { listPoliciesInputSchema } from '../../../../../common/workflows/step_types/endpoint/policies/list_policies';
import {
  LIST_POLICIES_MAX_RESULT_TOKENS,
  presentListPolicies,
} from '../../../../endpoint/services/policy_management/presentation/present_list_policies';

export const LIST_POLICIES_TOOL_ID = 'security.policy_management.list_policies';

export const listPoliciesSchema = lazySchema(() =>
  listPoliciesInputSchema.extend({
    perPage: listPoliciesInputSchema.shape.perPage.describe(
      'Page size (1–50, default 20). Usage and enrolled-agent counts are returned only in usage mode under endpoint-list read.'
    ),
    includeEndpointUsage: listPoliciesInputSchema.shape.includeEndpointUsage.describe(
      'When true, return per-policy enrolled-agent-backed usage classification. Requires endpoint-list read.'
    ),
  })
);

export const createListPoliciesTool = ({
  endpointAppContextService,
}: {
  endpointAppContextService: EndpointAppContextService;
}): BuiltinSkillBoundedTool<typeof listPoliciesSchema> =>
  createPolicyTool({
    endpointAppContextService,
    id: LIST_POLICIES_TOOL_ID,
    description:
      'List Elastic Defend endpoint policies in the current space as a bounded page of identity, ' +
      'normalized hash, and compact posture. Each item id is the reusable identifier for later get, compare, rollout status, or assess calls. ' +
      'When the user requests changing an individual setting to an explicit value (including across "each" or "every" policy), do not call this tool before or alongside field-reference lookup; call field reference first and wait until that value is validated against acceptedValues before listing policies. ' +
      'A name with name_string_truncated true is display-only and is not an exact stored name. Usage and enrolled-agent counts are returned only in usage mode under endpoint-list read. Does not write policies.',
    schema: listPoliciesSchema,
    maxResultTokens: LIST_POLICIES_MAX_RESULT_TOKENS,
    run: async (
      { page, perPage, includeEndpointUsage }: z.infer<typeof listPoliciesSchema>,
      service
    ) =>
      presentListPolicies(
        await service.listPolicies({
          page,
          perPage,
          includeEndpointUsage,
        })
      ),
  });
