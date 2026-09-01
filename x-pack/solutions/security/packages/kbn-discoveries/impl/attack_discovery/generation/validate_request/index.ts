/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE,
  hasAtLeastOneRetrievalToggle,
  PostGenerateRequestBody,
} from '@kbn/discoveries-schemas';
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

/**
 * Default composite workflow config when the request omits `workflow_config`:
 * the always-on skill gate's additional retrieval is on (Toggle 1), the other
 * two toggles are off, which satisfies the at-least-one-toggle rule.
 */
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
          ...(parsedWorkflowConfig.esql_query != null
            ? { esql_query: parsedWorkflowConfig.esql_query }
            : {}),
          skill_enabled: parsedWorkflowConfig.skill_enabled,
          validation_workflow_id: parsedWorkflowConfig.validation_workflow_id,
        }
      : getDefaultWorkflowConfig();

  if (!hasAtLeastOneRetrievalToggle(workflowConfig)) {
    return {
      body: {
        message: AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE,
      },
      ok: false,
    };
  }

  if (
    workflowConfig.default_retrieval_enabled &&
    workflowConfig.alert_retrieval_mode === 'esql' &&
    (workflowConfig.esql_query == null || workflowConfig.esql_query.trim() === '')
  ) {
    return {
      body: {
        message:
          'esql_query is required in workflow_config when default_retrieval_enabled is true and alert_retrieval_mode is "esql"',
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
