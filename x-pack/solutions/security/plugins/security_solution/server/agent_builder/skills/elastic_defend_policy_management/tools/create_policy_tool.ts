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
import type { StartServicesAccessor } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { z } from '@kbn/zod/v4';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import {
  EndpointAuthorizationError,
  EndpointHttpError,
  NotFoundError as EndpointNotFoundError,
} from '../../../../endpoint/errors';
import {
  POLICY_CHANGE_PREPARATION_ERROR_CODE,
  POLICY_CHANGE_REJECTED_MESSAGE,
  PolicyChangePreparationError,
  PolicyChangeRejectedError,
} from '../domain/impact';
import type { PolicyOperationRejection } from '../domain/impact';
import {
  createEndpointPolicyManagementService,
  type EndpointPolicyManagementService,
} from '../services/endpoint_policy_management_service';
import {
  InvalidEndpointPolicyError,
  POLICY_ERROR_MESSAGES,
  PolicyAmbiguousNameError,
  PolicyBaselineUnavailableError,
  PolicyBlockedChangeError,
  PolicyNoChangeError,
  PolicyNotFoundError,
  PolicyVersionConflictError,
  PolicyWriteRejectedError,
  PolicyWriteUnverifiedError,
  type PolicyWriteIdentity,
} from '../services/policy_errors';
import { presentBoundedIdentityStrings, type PresentedPolicyIdentity } from './trim_policy_result';

export type PolicyToolErrorClass =
  | 'not_authorized'
  | 'not_found'
  | 'ambiguous_name'
  | 'invalid_policy'
  | 'baseline_unavailable'
  | 'version_conflict'
  | 'blocked_change'
  | 'no_change'
  | 'write_rejected'
  | 'write_unverified'
  | 'rejected_operations'
  | 'invalid_input'
  | 'unknown_error';

export const POLICY_TOOL_ERROR_MESSAGES: Readonly<Record<PolicyToolErrorClass, string>> = {
  ...POLICY_ERROR_MESSAGES,
  rejected_operations: POLICY_CHANGE_REJECTED_MESSAGE,
  invalid_input: 'Requested policy change input is invalid',
  unknown_error: 'Failed to complete the policy management request',
};

interface CreatePolicyToolOptions<
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TResult extends Record<string, unknown>
> {
  endpointAppContextService: EndpointAppContextService;
  getStartServices: StartServicesAccessor;
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

export const classifyPolicyError = (error: unknown): PolicyToolErrorClass => {
  if (error instanceof EndpointAuthorizationError) {
    return 'not_authorized';
  }

  if (error instanceof PolicyNotFoundError || error instanceof EndpointNotFoundError) {
    return 'not_found';
  }

  if (error instanceof PolicyAmbiguousNameError) {
    return 'ambiguous_name';
  }

  if (error instanceof InvalidEndpointPolicyError) {
    return 'invalid_policy';
  }

  if (error instanceof PolicyBaselineUnavailableError) {
    return 'baseline_unavailable';
  }

  if (error instanceof PolicyVersionConflictError) {
    return 'version_conflict';
  }

  if (error instanceof PolicyBlockedChangeError) {
    return 'blocked_change';
  }

  if (error instanceof PolicyNoChangeError) {
    return 'no_change';
  }

  if (error instanceof PolicyWriteRejectedError) {
    return 'write_rejected';
  }

  if (error instanceof PolicyWriteUnverifiedError) {
    return 'write_unverified';
  }

  if (error instanceof PolicyChangeRejectedError) {
    return 'rejected_operations';
  }

  if (error instanceof PolicyChangePreparationError) {
    switch (error.code) {
      case POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input:
        return 'invalid_input';
      default:
        return 'unknown_error';
    }
  }

  if (error instanceof EndpointHttpError) {
    if (error.statusCode === 403) {
      return 'not_authorized';
    }
    if (error.statusCode === 404) {
      return 'not_found';
    }
  }

  return 'unknown_error';
};

type PolicyToolOrdinaryErrorMetadata = Record<string, unknown> & {
  error: PolicyToolErrorClass;
  candidates?: never;
  candidates_truncated?: never;
  candidates_total?: never;
  before?: never;
  observation?: never;
  observed?: never;
  rejections?: never;
  rejections_total?: never;
};

type PresentedCandidate = PresentedPolicyIdentity<{ id: string; name: string }>;

type PolicyToolAmbiguousNameErrorMetadata = Record<string, unknown> & {
  error: PolicyToolErrorClass;
  candidates: readonly PresentedCandidate[];
  candidates_truncated: PolicyAmbiguousNameError['candidatesTruncated'];
  candidates_total: PolicyAmbiguousNameError['candidatesTotal'];
};

type PresentedWriteIdentity = PresentedPolicyIdentity<PolicyWriteIdentity>;

type PolicyToolWriteUnverifiedErrorMetadata = Record<string, unknown> & {
  error: 'write_unverified';
  before: PresentedWriteIdentity;
  observation: 'available' | 'unavailable';
  observed?: PresentedWriteIdentity;
};

type PolicyToolRejectedOperationsErrorMetadata = Record<string, unknown> & {
  error: 'rejected_operations';
  rejections: readonly PolicyOperationRejection[];
  rejections_total: number;
};

type PolicyToolErrorMetadata =
  | PolicyToolOrdinaryErrorMetadata
  | PolicyToolAmbiguousNameErrorMetadata
  | PolicyToolWriteUnverifiedErrorMetadata
  | PolicyToolRejectedOperationsErrorMetadata;

const presentWriteIdentity = (identity: PolicyWriteIdentity): PresentedWriteIdentity =>
  presentBoundedIdentityStrings({
    id: identity.id,
    name: identity.name,
    revision: identity.revision,
    version: identity.version,
  });

const buildErrorMetadata = (
  error: unknown,
  errorClass: PolicyToolErrorClass
): PolicyToolErrorMetadata => {
  if (error instanceof PolicyAmbiguousNameError) {
    return {
      error: errorClass,
      candidates: error.candidates.map(({ id, name }) =>
        presentBoundedIdentityStrings({ id, name })
      ),
      candidates_truncated: error.candidatesTruncated,
      candidates_total: error.candidatesTotal,
    };
  }

  if (error instanceof PolicyWriteUnverifiedError) {
    const before = presentWriteIdentity(error.before);
    if (error.observed !== undefined) {
      return {
        error: 'write_unverified',
        before,
        observation: 'available',
        observed: presentWriteIdentity(error.observed),
      };
    }

    return {
      error: 'write_unverified',
      before,
      observation: 'unavailable',
    };
  }

  if (error instanceof PolicyChangeRejectedError) {
    return {
      error: 'rejected_operations',
      rejections: error.rejections,
      rejections_total: error.rejections.length,
    };
  }

  return { error: errorClass };
};

const toCauseMessage = (cause: unknown): string | undefined => {
  if (cause === undefined || cause === null) {
    return undefined;
  }
  return cause instanceof Error ? cause.message : String(cause);
};

const toPolicyErrorResult = (error: unknown, logger: Logger, toolId: string) => {
  const errorClass = classifyPolicyError(error);

  if (errorClass === 'unknown_error') {
    logger.error(`Error in ${toolId}: ${error instanceof Error ? error.message : String(error)}`);
  } else if (errorClass === 'write_unverified' && error instanceof PolicyWriteUnverifiedError) {
    const causeMessage = toCauseMessage(error.cause);
    const causeSuffix = causeMessage !== undefined ? `: ${causeMessage}` : '';
    logger.warn(`Write unverified in ${toolId} for policy ${error.before.id}${causeSuffix}`);
  } else {
    logger.debug(`Error in ${toolId}: ${errorClass}`);
  }

  return createErrorResult({
    message: POLICY_TOOL_ERROR_MESSAGES[errorClass],
    metadata: buildErrorMetadata(error, errorClass),
  });
};

export const createPolicyTool = <
  TSchema extends z.ZodObject<z.ZodRawShape>,
  TResult extends Record<string, unknown>
>({
  endpointAppContextService,
  getStartServices,
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
        getStartServices,
        request: ctx.request,
        spaceId: ctx.spaceId,
      });
      return { results: [createOtherResult(await run(params, service, ctx))] };
    } catch (error) {
      return { results: [toPolicyErrorResult(error, ctx.logger, id)] };
    }
  },
});
