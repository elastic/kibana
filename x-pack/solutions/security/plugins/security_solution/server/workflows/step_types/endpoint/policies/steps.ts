/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { ExecutionError } from '@kbn/workflows/server';
import type { z } from '@kbn/zod/v4';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import { ENVELOPE_TOKEN_BUDGET } from '../../../../../common/workflows/step_types/common/budget';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { createEndpointPolicyManagementService } from '../../../../endpoint/services/policy_management/services/endpoint_policy_management_service';
import type { EndpointPolicyManagementService } from '../../../../endpoint/services/policy_management/services/endpoint_policy_management_service';
import { toPolicyRef } from '../../../../endpoint/services/policy_management/domain/input_schemas';
import { presentListPolicies } from '../../../../endpoint/services/policy_management/presentation/present_list_policies';
import {
  presentGetPolicy,
  presentGetPolicyBaseline,
} from '../../../../endpoint/services/policy_management/presentation/present_get_policy';
import { presentComparePolicies } from '../../../../endpoint/services/policy_management/presentation/present_compare_policies';
import { presentAssessPolicyChange } from '../../../../endpoint/services/policy_management/presentation/present_assess_policy_change';
import { presentPolicyRolloutStatus } from '../../../../endpoint/services/policy_management/presentation/present_get_policy_rollout_status';
import { presentPolicyError } from '../../../../endpoint/services/policy_management/presentation/present_policy_error';
import {
  getEndpointPolicyFieldReferenceStepCommonDefinition,
  listEndpointPoliciesStepCommonDefinition,
  getEndpointPolicyStepCommonDefinition,
  getEndpointPolicyBaselineStepCommonDefinition,
  compareEndpointPoliciesStepCommonDefinition,
  getEndpointPolicyRolloutStatusStepCommonDefinition,
  assessEndpointPolicyChangeStepCommonDefinition,
} from '../../../../../common/workflows/step_types/endpoint/policies/steps';
import { resolveSpaceId } from '../../get_alert_entities_step/resolve_space_id';
import { presentFieldReference } from './present_field_reference';
import { presentPolicyStepError } from './present_policy_step_error';

const requirePolicyStepEnvelope = <Output extends object>(output: Output): { output: Output } => {
  const envelope = { output };
  if (estimateTokens(JSON.stringify(envelope)) > ENVELOPE_TOKEN_BUDGET) {
    throw new Error('Endpoint policy step output exceeded the token envelope');
  }
  return envelope;
};

const createPolicyReadStep = <Input extends z.ZodObject, Output extends z.ZodObject>(
  definition: CommonStepDefinition<Input, Output>,
  endpointAppContextService: EndpointAppContextService,
  run: (input: z.infer<Input>, service: EndpointPolicyManagementService) => Promise<object>
) =>
  createServerStepDefinition({
    ...definition,
    handler: async (context: StepHandlerContext<Input>) => {
      const parsed = definition.inputSchema.safeParse(context.input);
      if (!parsed.success) {
        throw new ExecutionError({ type: 'ValidationError', message: parsed.error.message });
      }
      const input = parsed.data;
      context.abortSignal.throwIfAborted();
      const spaceId = await resolveSpaceId(context.contextManager);
      const service = createEndpointPolicyManagementService({
        endpointAppContextService,
        request: context.contextManager.getFakeRequest(),
        spaceId,
      });
      let response: object;
      try {
        const result = await run(input, service);
        response = { status: 'success', ...result };
      } catch (error) {
        context.abortSignal.throwIfAborted();
        const presented = presentPolicyError(
          error,
          endpointAppContextService.createLogger('policy_workflow_steps'),
          definition.id
        );
        response = presentPolicyStepError(presented);
      }
      context.abortSignal.throwIfAborted();
      return requirePolicyStepEnvelope(definition.outputSchema.parse(response));
    },
  });

export const createGetEndpointPolicyFieldReferenceStepDefinition = (
  service: EndpointAppContextService
) =>
  createPolicyReadStep(
    getEndpointPolicyFieldReferenceStepCommonDefinition,
    service,
    async ({ selector }, pm) => presentFieldReference(await pm.getPolicyFieldReference(selector))
  );
export const createListEndpointPoliciesStepDefinition = (service: EndpointAppContextService) =>
  createPolicyReadStep(listEndpointPoliciesStepCommonDefinition, service, async (input, pm) => ({
    result: presentListPolicies(await pm.listPolicies(input)),
  }));
export const createGetEndpointPolicyStepDefinition = (service: EndpointAppContextService) =>
  createPolicyReadStep(getEndpointPolicyStepCommonDefinition, service, async (input, pm) => {
    const { policy, normalizedConfig, normalizedHash } = await pm.getPolicy(input);
    return { result: presentGetPolicy(policy, normalizedConfig, normalizedHash) };
  });
export const createGetEndpointPolicyBaselineStepDefinition = (service: EndpointAppContextService) =>
  createPolicyReadStep(
    getEndpointPolicyBaselineStepCommonDefinition,
    service,
    async ({ preset }, pm) => ({
      result: presentGetPolicyBaseline(await pm.getPolicyBaseline(preset)),
    })
  );
export const createCompareEndpointPoliciesStepDefinition = (service: EndpointAppContextService) =>
  createPolicyReadStep(
    compareEndpointPoliciesStepCommonDefinition,
    service,
    async ({ from, to }, pm) => {
      const comparison = await pm.comparePolicies(toPolicyRef(from), toPolicyRef(to));
      return { result: presentComparePolicies(comparison.from, comparison.to, comparison.diffs) };
    }
  );
export const createGetEndpointPolicyRolloutStatusStepDefinition = (
  service: EndpointAppContextService
) =>
  createPolicyReadStep(
    getEndpointPolicyRolloutStatusStepCommonDefinition,
    service,
    async (input, pm) => ({
      result: presentPolicyRolloutStatus(await pm.getPolicyRolloutStatus(input)),
    })
  );
export const createAssessEndpointPolicyChangeStepDefinition = (
  service: EndpointAppContextService
) =>
  createPolicyReadStep(
    assessEndpointPolicyChangeStepCommonDefinition,
    service,
    async (input, pm) => ({ result: presentAssessPolicyChange(await pm.assessPolicyChange(input)) })
  );
