/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { TraceOptions } from '@kbn/elastic-assistant/impl/assistant/types';
import type { PostAttackDiscoveryGenerateRequestBody } from '@kbn/elastic-assistant-common';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_GENERATE,
  PostAttackDiscoveryGenerateResponse,
} from '@kbn/elastic-assistant-common';
import { PostGenerateRequestBody, PostGenerateResponse } from '@kbn/discoveries-schemas';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { isEmpty } from 'lodash/fp';
import { getWorkflowSettings } from '../settings_flyout/workflow_configuration';
import type { WorkflowConfiguration } from '../settings_flyout/workflow_configuration/types';

// aligns with OpenAiProviderType from '@kbn/stack-connectors-plugin/common/openai/types'
export enum OpenAiProviderType {
  OpenAi = 'OpenAI',
  AzureAi = 'Azure OpenAI',
  Other = 'Other',
}

interface GenAiConfig {
  apiProvider?: OpenAiProviderType;
  apiUrl?: string;
  defaultModel?: string;
}

/**
 * Returns the GenAiConfig for a given ActionConnector. Note that if the connector is preconfigured,
 * the config will be undefined as the connector is neither available nor editable.
 *
 * @param connector
 */
export const getGenAiConfig = (connector: ActionConnector | undefined): GenAiConfig | undefined => {
  if (!connector?.isPreconfigured) {
    const config = (connector as ActionConnectorProps<GenAiConfig, unknown>)?.config;
    const { apiProvider, apiUrl, defaultModel } = config ?? {};

    return {
      apiProvider,
      apiUrl,
      defaultModel:
        apiProvider === OpenAiProviderType.AzureAi
          ? getAzureApiVersionParameter(apiUrl ?? '')
          : defaultModel,
    };
  }

  return undefined; // the connector is neither available nor editable
};

const getAzureApiVersionParameter = (url: string): string | undefined => {
  const urlSearchParams = new URLSearchParams(new URL(url).search);
  return urlSearchParams.get('api-version') ?? undefined;
};

export const getRequestBody = ({
  alertsIndexPattern,
  anonymizationFields,
  connectorId,
  genAiConfig,
  selectedConnector,
  size,
  traceOptions,
}: {
  alertsIndexPattern: string | undefined;
  anonymizationFields: {
    page: number;
    perPage: number;
    total: number;
    data: Array<{
      id: string;
      field: string;
      timestamp?: string | undefined;
      allowed?: boolean | undefined;
      anonymized?: boolean | undefined;
      updatedAt?: string | undefined;
      updatedBy?: string | undefined;
      createdAt?: string | undefined;
      createdBy?: string | undefined;
      namespace?: string | undefined;
    }>;
  };
  connectorId?: string;
  genAiConfig?: GenAiConfig;
  selectedConnector?: ActionConnector;
  size: number;
  traceOptions: TraceOptions;
}): PostAttackDiscoveryGenerateRequestBody => ({
  alertsIndexPattern: alertsIndexPattern ?? '',
  anonymizationFields: anonymizationFields?.data ?? [],
  langSmithProject: isEmpty(traceOptions?.langSmithProject)
    ? undefined
    : traceOptions?.langSmithProject,
  langSmithApiKey: isEmpty(traceOptions?.langSmithApiKey)
    ? undefined
    : traceOptions?.langSmithApiKey,
  replacements: {}, // no need to re-use replacements in the current implementation
  size,
  subAction: 'invokeAI', // non-streaming
  apiConfig: {
    actionTypeId: selectedConnector?.actionTypeId ?? '', // resolved server-side via inference.getConnectorById
    connectorId: selectedConnector?.id ?? connectorId ?? '',
    model: genAiConfig?.defaultModel,
    provider: genAiConfig?.apiProvider,
  },
});

/**
 * Gets the workflow configuration from local storage for a specific space.
 * Returns settings that control which alert retrieval and validation workflows to run.
 *
 * @param spaceId - The current space ID
 * @returns Workflow configuration with alert retrieval and validation settings
 */
export const getWorkflowConfig = (
  spaceId: string
): {
  alert_retrieval_mode: 'custom_only' | 'custom_query' | 'esql';
  alert_retrieval_workflow_ids: string[];
  esql_query?: string;
  validation_workflow_id: string;
} => {
  const settings: WorkflowConfiguration = getWorkflowSettings(spaceId);

  return {
    alert_retrieval_mode: settings.alertRetrievalMode,
    alert_retrieval_workflow_ids: settings.alertRetrievalWorkflowIds,
    ...(settings.esqlQuery != null ? { esql_query: settings.esqlQuery } : {}),
    validation_workflow_id: settings.validationWorkflowId,
  };
};

interface CallInternalApiParams {
  alertsIndexPattern: string;
  apiConfig: {
    actionTypeId: string;
    connectorId: string;
    model?: string;
  };
  end?: string;
  filter?: Record<string, unknown>;
  http: HttpSetup;
  size: number;
  spaceId: string | null;
  start?: string;
}

/**
 * Calls the internal /internal/attack_discovery/_generate API with workflow configuration.
 * This API invokes the orchestrator which handles the pipeline:
 * alert retrieval → generation → validation
 *
 * @param params - Parameters for the internal API call
 * @returns Response from the internal API
 */
export const callInternalGenerateApi = async ({
  alertsIndexPattern,
  apiConfig,
  end,
  filter,
  http,
  size,
  spaceId,
  start,
}: CallInternalApiParams): Promise<unknown> => {
  // eslint-disable-next-line no-console
  console.debug('Using internal API with workflow orchestration');

  // Get workflow configuration from local storage (space-scoped)
  const workflowConfig = spaceId
    ? getWorkflowConfig(spaceId)
    : {
        alert_retrieval_mode: 'custom_query' as const,
        alert_retrieval_workflow_ids: [] as string[],
        validation_workflow_id: 'default',
      };

  // Build request body for internal API
  // NOTE: The internal API does NOT require pre-retrieved alerts - it will be handled
  // by the orchestrator workflow via the legacy alert retrieval step
  const internalRequestBody = PostGenerateRequestBody.parse({
    alerts_index_pattern: alertsIndexPattern,
    api_config: {
      action_type_id: apiConfig.actionTypeId,
      connector_id: apiConfig.connectorId,
      model: apiConfig.model,
    },
    end,
    filter,
    size,
    start,
    type: 'attack_discovery',
    workflow_config: workflowConfig,
  });

  const rawResponse = await http.post('/internal/attack_discovery/_generate', {
    body: JSON.stringify(internalRequestBody),
    version: '1',
  });

  // Parse response using internal API schema
  const parsedResponse = PostGenerateResponse.safeParse(rawResponse);
  if (!parsedResponse.success) {
    throw new Error('Failed to parse internal API response');
  }

  return rawResponse;
};

interface CallPublicApiParams {
  body: PostAttackDiscoveryGenerateRequestBody;
  http: HttpSetup;
}

/**
 * Calls the public /api/attack_discovery/_generate API.
 * This is the legacy API that handles the full generation flow internally.
 *
 * @param params - Parameters for the public API call
 * @returns Response from the public API
 */
export const callPublicGenerateApi = async ({
  body,
  http,
}: CallPublicApiParams): Promise<unknown> => {
  // eslint-disable-next-line no-console
  console.debug('Using public API (feature flag disabled)');

  const rawResponse = await http.post(ATTACK_DISCOVERY_GENERATE, {
    body: JSON.stringify(body),
    version: API_VERSIONS.public.v1,
  });

  const parsedResponse = PostAttackDiscoveryGenerateResponse.safeParse(rawResponse);
  if (!parsedResponse.success) {
    throw new Error('Failed to parse the response');
  }

  return rawResponse;
};
