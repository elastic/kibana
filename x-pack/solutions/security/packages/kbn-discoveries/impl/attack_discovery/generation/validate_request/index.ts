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
  alert_retrieval_workflows_enabled: false,
  default_retrieval_enabled: false,
  skill_enabled: true,
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
          alert_retrieval_workflows_enabled: parsedWorkflowConfig.alert_retrieval_workflows_enabled,
          default_retrieval_enabled: parsedWorkflowConfig.default_retrieval_enabled,
          esql_query: parsedWorkflowConfig.esql_query,
          skill_enabled: parsedWorkflowConfig.skill_enabled,
          validation_workflow_id: parsedWorkflowConfig.validation_workflow_id,
        }
      : getDefaultWorkflowConfig();

  if (
    workflowConfig.skill_enabled !== true &&
    workflowConfig.default_retrieval_enabled !== true &&
    workflowConfig.alert_retrieval_workflows_enabled !== true
  ) {
    return {
      body: {
        message:
          'At least one alert retrieval method must be enabled: set skill_enabled, default_retrieval_enabled, or alert_retrieval_workflows_enabled to true',
      },
      ok: false,
    };
  }

  if (
    workflowConfig.alert_retrieval_workflows_enabled === true &&
    workflowConfig.alert_retrieval_workflow_ids.length === 0
  ) {
    return {
      body: {
        message:
          'alert_retrieval_workflow_ids must include at least one workflow ID when alert_retrieval_workflows_enabled is true',
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
