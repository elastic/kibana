/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import type { DocumentEntry } from '@kbn/elastic-assistant-common';
import type { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';
import type { RuleCreationState, RuleCreationAnnotation } from '../state';
export interface ProcessKnowledgeBaseParams {
  model: InferenceChatModel;
  logger: Logger;
  kbDataClient?: AIAssistantKnowledgeBaseDataClient | null;
}

/**
 * Node that processes the AI Assistant knowledge base to retrieve relevant information
 * for detection rule creation based on the user query and current rule context
 */
export const processKnowledgeBaseNode = ({
  model,
  logger,
  kbDataClient,
}: ProcessKnowledgeBaseParams) => {
  return async (
    state: typeof RuleCreationAnnotation.State
  ): Promise<typeof RuleCreationAnnotation.State> => {
    logger.info('Processing knowledge base for rule creation context');

    try {
      if (!kbDataClient) {
        logger.debug('No knowledge base client available, skipping knowledge base processing');
        return state;
      }

      // Retrieve knowledge base documents
      const knowledgeDocuments = await kbDataClient.getRequiredKnowledgeBaseDocumentEntries();

      if (!knowledgeDocuments || knowledgeDocuments.length === 0) {
        logger.debug('No knowledge base documents found');
        return state;
      }

      const knowledgeBaseInsights = await extractKnowledgeBaseInsights({
        documents: knowledgeDocuments,
        userQuery: state.userQuery,
        model,
        logger,
      });

      return {
        ...state,
        knowledgeBaseContext: knowledgeBaseInsights,
      };
    } catch (error) {
      logger.error('Error processing knowledge base:', error);
      return {
        ...state,
        error: `Knowledge base processing failed: ${error.message}`,
      };
    }
  };
};

async function extractKnowledgeBaseInsights({
  documents,
  userQuery,
  model,
  logger,
}: {
  documents: DocumentEntry[];
  userQuery: string;
  model: InferenceChatModel;
  logger: Logger;
}): Promise<string> {
  try {
    const extractionPrompt = `You are a security expert extracting actionable insights from knowledge base documents for detection rule creation.

User Query: "${userQuery}"

Relevant Knowledge Base Documents:
${documents
  .map(
    (doc, index) => `
Document ${index + 1}:
${doc.text}
`
  )
  .join('\n\n')}

Extract and synthesize the most actionable insights from these documents for creating the detection rule. Focus on:

1. **Threat Context**: What threats, attack patterns, or techniques are relevant?
2. **Detection Strategy**: What detection approaches are recommended?
3. **Technical Details**: What fields, queries, or patterns should be used?

Provide a concise but comprehensive summary that will help improve the detection rule creation process.`;

    const insightsResponse = await model.invoke([
      new SystemMessage(
        'You are a security expert providing actionable insights for detection rule creation based on knowledge base information.'
      ),
      new HumanMessage(extractionPrompt),
    ]);

    const insights = insightsResponse.content as string;

    logger.debug('Successfully extracted knowledge base insights');

    return insights;
  } catch (error) {
    logger.debug('Error extracting knowledge base insights:', error);
    return '';
  }
}

export const createProcessKnowledgeBaseNode = (params: ProcessKnowledgeBaseParams) => {
  return (state: RuleCreationState) => processKnowledgeBaseNode(params)(state);
};
