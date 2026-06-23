/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, ToolMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { RuleMigrationsRetriever } from '../../../../../retrievers';
import type { ModelWithTools } from '../../../../types';
import type { RuleMigrationTelemetryClient } from '../../../../../rule_migrations_telemetry_client';
import {
  cleanMarkdown,
  generateAssistantComment,
} from '../../../../../../../common/task/util/comments';
import { RETRIEVE_INTEGRATION_PROMPT } from './prompts';
import type { RetrieveIntegrationsState } from './state';

interface GetRetrieveIntegrationsNodeParams {
  model: ModelWithTools;
  telemetryClient: RuleMigrationTelemetryClient;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}

interface IntegrationSearchPayload {
  source: 'integrationSearch';
  query: string;
  count: number;
  results: Array<{ id?: string; title: string; description: string }>;
  hasUsefulResults: boolean;
}

interface IntegrationMatchResponse {
  semantic_query?: string;
  id?: string;
  match?: string;
  summary?: string;
}

const NO_MATCH_SUMMARY = '## Integration Matching Summary\nNo related integration found.';

const jsonParser = new JsonOutputParser<IntegrationMatchResponse>();

export const getRetrieveIntegrationsNode = ({
  model,
  telemetryClient,
  ruleMigrationsRetriever,
}: GetRetrieveIntegrationsNodeParams) => {
  return async (state: RetrieveIntegrationsState): Promise<Partial<RetrieveIntegrationsState>> => {
    const prompt = await RETRIEVE_INTEGRATION_PROMPT.formatMessages({
      title: state.title,
      description: state.description,
      inlineQuery: state.inline_query,
      nlQuery: state.nl_query,
    });

    const response = await model.invoke([...prompt, ...state.messages]);

    const hasToolCall =
      response &&
      typeof response === 'object' &&
      'tool_calls' in response &&
      response?.tool_calls &&
      response?.tool_calls?.length > 0;

    if (hasToolCall) {
      return { messages: [response] };
    }

    const responseText = typeof response === 'string' ? response : response.text;
    let parsedResponse: IntegrationMatchResponse | undefined;
    try {
      parsedResponse = await jsonParser.parse(responseText);
    } catch {
      // LLM did not return valid JSON; fall back to tool payload data
    }
    const latestIntegrationPayload = getLatestIntegrationSearchPayload(state.messages);
    const semanticQuery =
      parsedResponse?.semantic_query?.trim() ||
      state.semantic_query ||
      latestIntegrationPayload?.query ||
      '';
    const matchedIntegrationId = (parsedResponse?.id || parsedResponse?.match || '').trim();
    const summary = parsedResponse?.summary?.trim() || NO_MATCH_SUMMARY;

    const fullIntegrationResults = semanticQuery
      ? await ruleMigrationsRetriever.integrations.search(semanticQuery)
      : [];

    let matchedIntegration = matchedIntegrationId
      ? fullIntegrationResults.find((integration) => integration.id === matchedIntegrationId)
      : undefined;

    if (matchedIntegrationId && !matchedIntegration) {
      const fallbackResults = await ruleMigrationsRetriever.integrations.search(
        matchedIntegrationId
      );
      matchedIntegration = fallbackResults.find(
        (integration) => integration.id === matchedIntegrationId
      );
    }

    telemetryClient.reportIntegrationsMatch({
      preFilterIntegrations: fullIntegrationResults,
      ...(matchedIntegration ? { postFilterIntegration: matchedIntegration } : {}),
    });

    return {
      ...(matchedIntegration ? { integration: matchedIntegration } : {}),
      comments: [generateAssistantComment(cleanMarkdown(summary))],
      semantic_query: semanticQuery,
      ...(BaseMessage.isInstance(response) ? { messages: [response] } : {}),
    };
  };
};

const getLatestIntegrationSearchPayload = (
  messages: BaseMessage[]
): IntegrationSearchPayload | undefined => {
  return [...messages]
    .reverse()
    .filter((msg): msg is ToolMessage => ToolMessage.isInstance(msg))
    .map((msg) => {
      try {
        const parsed = JSON.parse(typeof msg.content === 'string' ? msg.content : '');
        if (parsed.source === 'integrationSearch') {
          return parsed as IntegrationSearchPayload;
        }
      } catch {
        // ignore
      }
      return undefined;
    })
    .find((payload): payload is IntegrationSearchPayload => Boolean(payload));
};
