/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import {
  assessPolicyChangeParamsSchema,
  type AssessPolicyChangeParams,
} from '../../../../../common/workflows/step_types/endpoint/policies/policy_change_operation';
import { createPolicyTool } from './create_policy_tool';
import {
  ASSESS_POLICY_CHANGE_MAX_RESULT_TOKENS,
  presentAssessPolicyChange,
} from '../../../../endpoint/services/policy_management/presentation/present_assess_policy_change';

export const ASSESS_POLICY_CHANGE_TOOL_ID = 'security.policy_management.assess_policy_change';

export const assessPolicyChangeSchema = assessPolicyChangeParamsSchema;

export const createAssessPolicyChangeTool = ({
  endpointAppContextService,
}: {
  endpointAppContextService: EndpointAppContextService;
}): BuiltinSkillBoundedTool<typeof assessPolicyChangeSchema> =>
  createPolicyTool({
    endpointAppContextService,
    id: ASSESS_POLICY_CHANGE_TOOL_ID,
    description:
      'Assess a bounded proposed change to one Elastic Defend endpoint policy in the current space. ' +
      'Returns requested operations, requested direct impact, expanded intent, normalized diff, and derived side effects as separate facts, ' +
      'plus policy identity and version, enrolled-agent blast-radius source, population, and complete status map, ' +
      'advisories as PM-computed non-blocking consequences, ' +
      'globalBlockers as whole-policy blockers distinct from per-path eligibility, ' +
      'and per-path eligibility computed from registry license, current license, product features, and environment. ' +
      'If any requested operation is rejected, assessment halts without making changes and returns error rejected_operations with structured rejections identifying each rejected operation index, path, reason, and acceptedValues where applicable. ' +
      'sideEffects lists derived-setting updates only. ' +
      'Uses status.all as the enrolled-agent headline only when that key is present. ' +
      'Each returned section can be bounded; when a section is truncated its *_value_truncated is true and *_value_total is the complete count, and an empty truncated section is not a no-op and is not evidence of no impact. Section-level *_value_truncated uses *_value_total and means the section is incomplete; a value_truncation summary on a requested operation or a from_truncation or to_truncation summary on a row means that displayed value is partial, with truncation sites listed at paths relative to that value, string, array, and object truncation distinguished, and entries capped at 50 with entries_truncated true disclosing further sites. ' +
      'Does not write policies.',
    schema: assessPolicyChangeSchema,
    maxResultTokens: ASSESS_POLICY_CHANGE_MAX_RESULT_TOKENS,
    run: async (params: AssessPolicyChangeParams, service) => {
      const dto = await service.assessPolicyChange(params);
      return presentAssessPolicyChange(dto);
    },
  });
