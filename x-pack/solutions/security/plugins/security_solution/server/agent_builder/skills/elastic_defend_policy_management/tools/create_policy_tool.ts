/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type {
  BuiltInToolConfirmationPolicy,
  ToolHandlerContext,
} from '@kbn/agent-builder-server/tools';
import type { z } from '@kbn/zod/v4';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import {
  createEndpointPolicyManagementService,
  type EndpointPolicyManagementService,
} from '../../../../endpoint/services/policy_management/services/endpoint_policy_management_service';
import { presentPolicyError } from '../../../../endpoint/services/policy_management/presentation/present_policy_error';

interface CreatePolicyToolOptions<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TResult extends Record<string, unknown>,
> {
  endpointAppContextService: EndpointAppContextService;
  id: string;
  description: string;
  schema: TSchema;
  maxResultTokens?: number;
  confirmation?: BuiltInToolConfirmationPolicy<z.infer<TSchema>>;
  run: (
    params: z.infer<TSchema>,
    service: EndpointPolicyManagementService,
    ctx: ToolHandlerContext
  ) => Promise<TResult> | TResult;
}

export const createPolicyTool = <
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TResult extends Record<string, unknown>,
>({
  endpointAppContextService,
  id,
  description,
  schema,
  maxResultTokens,
  confirmation,
  run,
}: CreatePolicyToolOptions<TSchema, TResult>): BuiltinSkillBoundedTool<TSchema> => ({
  id,
  type: ToolType.builtin,
  description,
  schema,
  ...(maxResultTokens !== undefined ? { maxResultTokens } : {}),
  ...(confirmation !== undefined ? { confirmation } : {}),
  handler: async (params: z.infer<TSchema>, ctx: ToolHandlerContext) => {
    try {
      const service = createEndpointPolicyManagementService({
        endpointAppContextService,
        request: ctx.request,
        spaceId: ctx.spaceId,
      });
      return { results: [createOtherResult(await run(params, service, ctx))] };
    } catch (error) {
      return { results: [createErrorResult(presentPolicyError(error, ctx.logger, id))] };
    }
  },
});
