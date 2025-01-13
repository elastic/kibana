/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { RuleMigrationsRetriever } from '../../../../../retrievers';
import type { ChatModel } from '../../../../../util/actions_client_chat';
import type { GraphNode } from '../../types';
import { MATCH_INTEGRATION_PROMPT } from './prompts';
import { cleanMarkdown } from '../../../../../util/comments';

interface GetRetrieveIntegrationsNodeParams {
  model: ChatModel;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}

interface GetMatchedIntegrationResponse {
  match: string;
  summary: string;
}

export const getRetrieveIntegrationsNode = ({
  model,
  ruleMigrationsRetriever,
}: GetRetrieveIntegrationsNodeParams): GraphNode => {
  return async (state) => {
    const query = state.semantic_query;

    const integrations = await ruleMigrationsRetriever.integrations.getIntegrations(query);
    if (integrations.length === 0) {
      return { comments: ['## Integration Matching Summary\nNo related integration found.'] };
    }

    const outputParser = new JsonOutputParser();
    const mostRelevantIntegration = MATCH_INTEGRATION_PROMPT.pipe(model).pipe(outputParser);

    const integrationsInfo = integrations.map((integration) => ({
      title: integration.title,
      description: integration.description,
    }));
    const splunkRule = {
      title: state.original_rule.title,
      description: state.original_rule.description,
    };

    /*
     * Takes the most relevant integration from the array of integration(s) returned by the semantic query, returns either the most relevant or none.
     */
    const integrationsJson = JSON.stringify(integrationsInfo, null, 2);
    const response = (await mostRelevantIntegration.invoke({
      integrations: integrationsJson,
      splunk_rule: JSON.stringify(splunkRule, null, 2),
    })) as GetMatchedIntegrationResponse;

    const comments = response.summary ? [cleanMarkdown(response.summary)] : undefined;

    if (response.match) {
      const matchedIntegration = integrations.find((r) => r.title === response.match);
      if (matchedIntegration) {
        return { integration: matchedIntegration, comments };
      }
    }
    return { comments };
  };
};
