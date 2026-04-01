/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PostGenerateRequestBody } from '@kbn/discoveries-schemas';
import type { PostGenerateRequestBody as PostGenerateRequestBodyType } from '@kbn/discoveries-schemas';
import type { ResponseError } from '@kbn/core/server';
import type { WorkflowConfig } from '../types';

interface ValidateRequestSuccess {
  ok: true;
  requestBody: PostGenerateRequestBodyType;
  workflowConfig: WorkflowConfig;
}

interface ValidateRequestFailure {
  body: ResponseError;
  ok: false;
}

export type ValidateRequestResult = ValidateRequestSuccess | ValidateRequestFailure;

const getDefaultWorkflowConfig = (): WorkflowConfig => ({
  alert_retrieval_mode: 'custom_query',
  alert_retrieval_workflow_ids: [],
  validation_workflow_id: 'default',
});

const hasPreRetrievedAlerts = (requestBody: unknown): boolean =>
  typeof requestBody === 'object' && requestBody !== null && 'alerts' in requestBody;

export const validateRequest = ({
  requestBody,
}: {
  requestBody: unknown;
}): ValidateRequestResult => {
  if (hasPreRetrievedAlerts(requestBody)) {
    return {
      body: {
        message:
          'Pre-retrieved alerts are not supported on this endpoint. Remove the alerts property from the request body.',
      },
      ok: false,
    };
  }

  const requestBodyResult = PostGenerateRequestBody.safeParse(requestBody);

  if (!requestBodyResult.success) {
    return {
      body: requestBodyResult.error,
      ok: false,
    };
  }

  const validatedRequestBody = requestBodyResult.data;

  const parsedWorkflowConfig = validatedRequestBody.workflow_config;
  const workflowConfig: WorkflowConfig =
    parsedWorkflowConfig != null
      ? {
          alert_retrieval_mode: parsedWorkflowConfig.alert_retrieval_mode,
          alert_retrieval_workflow_ids: parsedWorkflowConfig.alert_retrieval_workflow_ids,
          esql_query: parsedWorkflowConfig.esql_query,
          validation_workflow_id: parsedWorkflowConfig.validation_workflow_id,
        }
      : getDefaultWorkflowConfig();

  if (
    workflowConfig.alert_retrieval_mode === 'custom_only' &&
    workflowConfig.alert_retrieval_workflow_ids.length === 0
  ) {
    return {
      body: {
        message:
          'At least one alert retrieval method must be specified: either set alert_retrieval_mode to a value other than "custom_only", or provide alert_retrieval_workflow_ids',
      },
      ok: false,
    };
  }

  if (
    workflowConfig.alert_retrieval_mode === 'esql' &&
    (workflowConfig.esql_query == null || workflowConfig.esql_query.trim() === '')
  ) {
    return {
      body: {
        message: 'esql_query is required in workflow_config when alert_retrieval_mode is "esql"',
      },
      ok: false,
    };
  }

  if (
    workflowConfig.default_alert_retrieval_mode === 'esql' &&
    (workflowConfig.esql_query == null || workflowConfig.esql_query.trim() === '')
  ) {
    return {
      body: {
        message:
          'esql_query is required in workflow_config when default_alert_retrieval_mode is "esql"',
      },
      ok: false,
    };
  }

  if (
    workflowConfig.default_alert_retrieval_mode === 'provided' &&
    (workflowConfig.provided_context == null || workflowConfig.provided_context.length === 0)
  ) {
    return {
      body: {
        message:
          'provided_context is required in workflow_config when default_alert_retrieval_mode is "provided"',
      },
      ok: false,
    };
  }

  if (!validatedRequestBody.alerts_index_pattern) {
    return {
      body: {
        message: 'alerts_index_pattern is required for pipeline kickoff',
      },
      ok: false,
    };
  }

  return {
    ok: true,
    requestBody: validatedRequestBody,
    workflowConfig,
  };
};
