/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { assessPolicyChangeParamsSchema } from '../domain/impact';
import { POLICY_IDENTIFIER_MAX_LENGTH, policyIdentifierInputSchema } from '../domain/input_schemas';
import type {
  ApplyPolicyChangePreview,
  ApplyPolicyChangeResult,
} from '../services/apply_policy_change';
import { createEndpointPolicyManagementService } from '../services/endpoint_policy_management_service';
import { PolicyWriteRejectedError } from '../services/policy_errors';
import {
  renderApplyPolicyChangeConfirmation,
  selectApplyPreviewFacts,
} from './apply_policy_change_confirmation';
import { presentApplyPolicyChangeResult } from './present_apply_policy_change_result';
import { createPolicyTool } from './create_policy_tool';

export const APPLY_POLICY_CHANGE_TOOL_ID = 'security.policy_management.apply_policy_change';

const APPLY_POLICY_CHANGE_MAX_RESULT_TOKENS = 12_000;

export const applyPolicyChangeSchema = z
  .object({
    idOrName: policyIdentifierInputSchema.describe(
      'Saved-object id or exact full stored endpoint policy name in the current space. ' +
        'A presented name with name_string_truncated true is display-only; pass the policy id as later idOrName.'
    ),
    changes: assessPolicyChangeParamsSchema.shape.changes.describe(
      'The same change operations assessed for this policy in the current conversation, at most 50.'
    ),
    expectedVersion: z
      .string()
      .min(1)
      .max(POLICY_IDENTIFIER_MAX_LENGTH)
      .describe(
        'The version returned by the successful assessment of this policy for these same operations in the current conversation. ' +
          'Never a policy revision and never a version from a later policy read. ' +
          'A truncated version cannot match and the apply reports a conflict.'
      ),
  })
  .strict();

export type ApplyPolicyChangeInput = z.infer<typeof applyPolicyChangeSchema>;

export const createApplyPolicyChangeTool = ({
  endpointAppContextService,
  getStartServices,
}: {
  endpointAppContextService: EndpointAppContextService;
  getStartServices: StartServicesAccessor;
}): BuiltinSkillBoundedTool<typeof applyPolicyChangeSchema> =>
  createPolicyTool({
    endpointAppContextService,
    getStartServices,
    id: APPLY_POLICY_CHANGE_TOOL_ID,
    description:
      'Apply one previously assessed tier-1 change set to one Elastic Defend endpoint policy in the current space after the user confirms the rendered change card. ' +
      'Requires expectedVersion from the matching successful assessment of the same policy and the same operations in this conversation; never a revision and never a version from a later policy read. ' +
      'Returns before and after bounded identities, requestedChanges, sideEffects, residual differences between the proposal and the policy Fleet returns, and enrollment as observed during handler preparation; confirmation-card enrollment is an earlier preview-time observation and may differ. ' +
      'requestedChanges are the assessed and confirmed proposal rows submitted to Fleet and sideEffects are assessment-predicted effects; neither proves final state. after and residual describe the policy Fleet returned. ' +
      'Each returned section can be bounded; when a section is truncated its *_value_truncated is true and *_value_total is the complete count, and an empty truncated section is neither a no-op nor evidence of no impact. ' +
      'A from_truncation or to_truncation summary on a row means that displayed value is partial, with truncation sites listed at paths relative to that value, string, array, and object truncation distinguished, and entries capped at 50 with entries_truncated true disclosing further sites and entries_total reporting the complete count. ' +
      'Reports use returned rows only and never reconstruct omitted values. ' +
      'Writes one policy after confirmation and refuses advanced settings.',
    schema: applyPolicyChangeSchema,
    maxResultTokens: APPLY_POLICY_CHANGE_MAX_RESULT_TOKENS,
    confirmation: {
      askUser: 'always',
      getConfirmation: async ({ toolParams, context }) => {
        const params = applyPolicyChangeSchema.parse(toolParams);
        const service = createEndpointPolicyManagementService({
          endpointAppContextService,
          getStartServices,
          request: context.request,
          spaceId: context.spaceId,
        });
        const preview: ApplyPolicyChangePreview = await service.previewApplyPolicyChange(params);
        return renderApplyPolicyChangeConfirmation(selectApplyPreviewFacts(preview));
      },
    },
    run: async (params: ApplyPolicyChangeInput, service, ctx) => {
      const callSource = ctx.callContext.callSource;
      if (callSource !== 'agent') {
        throw new PolicyWriteRejectedError();
      }

      const result: ApplyPolicyChangeResult = await service.applyPolicyChange(params, {
        callSource,
      });
      return presentApplyPolicyChangeResult(result);
    },
  });
