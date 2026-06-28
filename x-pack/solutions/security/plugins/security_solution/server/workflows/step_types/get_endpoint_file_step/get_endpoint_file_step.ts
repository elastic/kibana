/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPollServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { z } from '@kbn/zod/v4';
import { ACTION_DETAILS_ROUTE, GET_FILE_ROUTE } from '../../../../common/endpoint/constants';
import type {
  ActionDetailsApiResponse,
  ResponseActionApiResponse,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
} from '../../../../common/endpoint/types';
import {
  getEndpointFileInputSchema,
  getEndpointFileStepCommonDefinition,
} from '../../../../common/workflows/step_types/get_endpoint_file_step/get_endpoint_file_step_common';

const getEndpointFileStateSchema = z.object({
  action_id: z.string(),
  endpoint_id: getEndpointFileInputSchema.shape.endpoint_id,
});

const MAX_POLL_INTERVAL_MS = 5 * 60_000;
const MAX_POLL_DURATION_MS = 24 * 60 * 60_000;
const MAX_POLL_ATTEMPTS = Math.ceil(MAX_POLL_DURATION_MS / MAX_POLL_INTERVAL_MS);

const pollPolicy = {
  strategy: 'exponential',
  initialMs: 10_000,
  maxMs: MAX_POLL_INTERVAL_MS,
  multiplier: 2,
  jitter: true,
} as const;

const pollCeilings = {
  maxAttempts: MAX_POLL_ATTEMPTS,
  maxWaitMs: MAX_POLL_INTERVAL_MS,
};

const toArray = (value: string | string[] | undefined): string[] | undefined => {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value : [value];
};

const getActionDetailsPath = (actionId: string): string =>
  ACTION_DETAILS_ROUTE.replace('{action_id}', actionId);

const createApiError = (message: string, details?: Record<string, unknown>): ExecutionError =>
  new ExecutionError({
    type: 'ApiError',
    message,
    details,
  });

const toExecutionError = (error: unknown): ExecutionError => {
  if (error instanceof ExecutionError) {
    return error;
  }
  return createApiError(error instanceof Error ? error.message : 'Unknown error occurred', {
    error,
  });
};

export const getEndpointFileStepDefinition = createPollServerStepDefinition({
  ...getEndpointFileStepCommonDefinition,
  stateSchema: getEndpointFileStateSchema,
  start: async (context) => {
    const {
      endpoint_id: endpointId,
      file_path: filePath,
      alert_ids: alertIds,
      case_ids: caseIds,
    } = context.input;

    try {
      const { status, body } = await context.contextManager.callKibanaApi<
        ResponseActionApiResponse<ResponseActionGetFileOutputContent>
      >({
        method: 'POST',
        path: GET_FILE_ROUTE,
        body: {
          endpoint_ids: [endpointId],
          parameters: {
            path: filePath,
          },
          alert_ids: toArray(alertIds),
          case_ids: toArray(caseIds),
          comment: context.input.comment,
        },
      });

      if (status >= 400) {
        return {
          error: createApiError(`Failed to request endpoint file: HTTP ${status}`, { body }),
        };
      }

      const actionId = body.data?.id;
      if (!actionId) {
        return {
          error: createApiError('Endpoint get-file response did not include an action ID', {
            body,
          }),
        };
      }

      context.logger.info(`Submitted endpoint get-file response action ${actionId}`);

      return {
        state: {
          action_id: actionId,
          endpoint_id: endpointId,
        },
      };
    } catch (error) {
      return { error: toExecutionError(error) };
    }
  },
  poll: async (context) => {
    const state = context.state;

    if (!state) {
      throw new Error('Poll ran before start() seeded endpoint get-file state.');
    }

    try {
      const { status, body } = await context.contextManager.callKibanaApi<
        ActionDetailsApiResponse<
          ResponseActionGetFileOutputContent,
          ResponseActionGetFileParameters
        >
      >({
        method: 'GET',
        path: getActionDetailsPath(state.action_id),
      });

      if (status >= 400) {
        return {
          error: createApiError(`Failed to get endpoint action details: HTTP ${status}`, { body }),
        };
      }

      const actionDetails = body.data;
      if (actionDetails.isExpired) {
        return {
          error: createApiError(`Endpoint get-file action ${state.action_id} expired`, {
            actionDetails,
          }),
        };
      }

      if (!actionDetails.isCompleted) {
        context.logger.debug(
          `Endpoint get-file action ${state.action_id} is ${actionDetails.status}; polling again`
        );
        return { state };
      }

      if (actionDetails.wasCanceled || actionDetails.status === 'canceled') {
        return {
          error: createApiError(`Endpoint get-file action ${state.action_id} was canceled`, {
            actionDetails,
          }),
        };
      }

      if (!actionDetails.wasSuccessful || actionDetails.status !== 'successful') {
        return {
          error: createApiError(`Endpoint get-file action ${state.action_id} failed`, {
            actionDetails,
          }),
        };
      }

      const output = actionDetails.outputs?.[state.endpoint_id];
      const downloadUri = output?.content.downloadUri;

      if (!downloadUri) {
        return {
          error: createApiError(
            `Endpoint get-file action ${state.action_id} completed without a download URI`,
            {
              actionDetails,
            }
          ),
        };
      }

      return {
        output: {
          action_id: state.action_id,
          endpoint_id: state.endpoint_id,
          download_uri: downloadUri,
          status: 'successful' as const,
          completed_at: actionDetails.completedAt,
          zip_size: output.content.zip_size,
          contents: output.content.contents ?? [],
        },
      };
    } catch (error) {
      return { error: toExecutionError(error) };
    }
  },
  policy: pollPolicy,
  ceilings: pollCeilings,
});
