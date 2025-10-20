/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { contentReferenceBlock } from '@kbn/elastic-assistant-common';
import type { ContentReferencesStore } from '@kbn/elastic-assistant-common';
import type { ToolResultProcessorParams, ToolResultsProcessorParams } from './types';
import {
  isProductDocumentationResult,
  isAlertCountsResult,
  isOpenAndAcknowledgedAlertsResult,
  isKnowledgeBaseRetrievalResult,
  isKnowledgeBaseWriteResult,
  isSecurityLabsKnowledgeResult,
  isIntegrationKnowledgeResult,
  isEntityRiskScoreResult,
} from './helpers';

// Helper function to register citations from tool results
export const registerCitationsFromToolResult = (
  result: {
    data?: {
      citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }>;
    };
  },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): void => {
  if (!result.data?.citations || !Array.isArray(result.data.citations)) {
    return;
  }

  const basePath = assistantContext.getServerBasePath();

  result.data.citations.forEach((citation, index) => {
    // Register each citation in the store with the exact ID from the tool
    // This allows the frontend to resolve {reference(id)} placeholders
    const registeredRef = contentReferencesStore.add((p) => {
      // Create the base reference object
      const baseRef: Record<string, unknown> = {
        id: citation.id,
        type: citation.type,
        ...citation.metadata,
      };

      // Add basePath to Href types if href is relative
      if (
        citation.type === 'Href' &&
        typeof citation.metadata.href === 'string' &&
        citation.metadata.href.startsWith('/')
      ) {
        baseRef.href = `${basePath}${citation.metadata.href}`;
      }

      return baseRef as Parameters<typeof contentReferencesStore.add>[0] extends (
        p: infer P
      ) => infer R
        ? R
        : never;
    });
  });
};

// Helper function to process product documentation results
export const processProductDocumentationResults = (
  result: { data: { content: { documents: Array<{ url?: string; title?: string }> } } },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  // Tools embed citations inline, agent just registers them
  return '';
};

// Helper function to process alert results
export const processAlertResults = (
  result: { data: { alerts: string[] } },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  return '';
};

// Helper function to process knowledge base retrieval results
export const processKnowledgeBaseRetrievalResults = (
  result: {
    data: {
      content?: string;
      message?: string;
      query: string;
      entries?: Array<{ id: string; name: string }>;
    };
  },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger,
  aiResponseMessage: string
): string => {
  // Register any citations provided by the tool

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  // The tool already embeds citations inline in the content
  return '';
};

// Helper function to process knowledge base write results
export const processKnowledgeBaseWriteResults = (
  result: { data: { entryId?: string; name: string; query: string } },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  return '';
};

// Helper function to process security labs knowledge results
export const processSecurityLabsKnowledgeResults = (
  result: {
    data: {
      content?: string;
      message?: string;
      question: string;
      citations?: Array<{ id: string; slug: string; title: string }>;
    };
  },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool

  // Convert Security Labs citations to the standard format
  if (result.data.citations && result.data.citations.length > 0) {
    const standardCitations = result.data.citations.map((citation) => ({
      id: citation.id,
      type: 'Href' as const,
      metadata: {
        href: `https://www.elastic.co/security-labs/${citation.slug}`,
        title: `Security Labs: ${citation.title}`,
      },
    }));

    // Use the standard citation registration function
    registerCitationsFromToolResult(
      {
        data: {
          citations: standardCitations,
        },
      },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  // Return empty string - let the AI intelligently place citations based on the content
  // The tool has already embedded {reference(...)} placeholders in the content
  // pruneContentReferences will extract and format any citations the AI includes
  return '';
};

// Helper function to process integration knowledge results
export const processIntegrationKnowledgeResults = (
  result: {
    data: { documents: Array<{ package_name: string; filename: string }>; question: string };
  },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  return '';
};

// Helper function to process entity risk score results
export const processEntityRiskScoreResults = (
  result: { data: { riskScore: number; entityName: string } },
  contentReferencesStore: ContentReferencesStore,
  assistantContext: { getServerBasePath: () => string },
  logger: Logger
): string => {
  // Register any citations provided by the tool

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Citations are now handled by registerCitationsFromToolResult
  return '';
};

// Helper function to process individual tool result
export const processToolResult = ({
  step,
  result,
  contentReferencesStore,
  logger,
  aiResponseMessage,
  assistantContext,
}: ToolResultProcessorParams): string => {
  // Skip content references for assistant_settings tool
  if ('tool_id' in step && step.tool_id === 'core.security.assistant_settings') {
    return '';
  }

  // Handle different types of tool results
  if (isProductDocumentationResult(step, result)) {
    return processProductDocumentationResults(
      result as { data: { content: { documents: Array<{ url?: string; title?: string }> } } },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  if (isAlertCountsResult(step, result)) {
    const reference = contentReferencesStore.add((p) => ({
      type: 'SecurityAlertsPage' as const,
      id: p.id,
    }));
    const citation = contentReferenceBlock(reference);
    return ` ${citation}`;
  }

  if (isOpenAndAcknowledgedAlertsResult(step, result)) {
    return processAlertResults(
      result as { data: { alerts: string[] } },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  if (isKnowledgeBaseRetrievalResult(step, result, logger)) {
    return processKnowledgeBaseRetrievalResults(
      result as {
        data: {
          content?: string;
          message?: string;
          query: string;
          entries?: Array<{ id: string; name: string }>;
        };
      },
      contentReferencesStore,
      assistantContext,
      logger,
      aiResponseMessage
    );
  }

  if (isKnowledgeBaseWriteResult(step, result)) {
    return processKnowledgeBaseWriteResults(
      result as { data: { entryId?: string; name: string; query: string } },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  if (isSecurityLabsKnowledgeResult(step, result)) {
    return processSecurityLabsKnowledgeResults(
      result as {
        data: {
          content?: string;
          message?: string;
          question: string;
          citations?: Array<{ id: string; slug: string; title: string }>;
        };
      },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  if (isIntegrationKnowledgeResult(step, result)) {
    return processIntegrationKnowledgeResults(
      result as {
        data: { documents: Array<{ package_name: string; filename: string }>; question: string };
      },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  if (isEntityRiskScoreResult(step, result)) {
    return processEntityRiskScoreResults(
      result as { data: { riskScore: number; entityName: string } },
      contentReferencesStore,
      assistantContext,
      logger
    );
  }

  // Register any citations provided by the tool

  registerCitationsFromToolResult(
    result as {
      data?: { citations?: Array<{ id: string; type: string; metadata: Record<string, unknown> }> };
    },
    contentReferencesStore,
    assistantContext,
    logger
  );

  // Return empty string since citations are already inline in the content
  // The agent should not append additional citation text
  return '';
};

// Helper function to process tool results and add content references
export const processToolResults = ({
  agentResult,
  contentReferencesStore,
  logger,
  assistantContext,
}: ToolResultsProcessorParams): string => {
  const aiResponseMessage = agentResult.result.round.response.message;
  let accumulatedContent = aiResponseMessage;

  if (!agentResult.result.round.steps || agentResult.result.round.steps.length === 0) {
    return accumulatedContent;
  }

  for (const step of agentResult.result.round.steps) {
    if (step.type === 'tool_call' && 'results' in step && step.results && step.results.length > 0) {
      for (const result of step.results) {
        if (result.type === 'other' && result.data) {
          accumulatedContent += processToolResult({
            step,
            result,
            contentReferencesStore,
            logger,
            aiResponseMessage,
            assistantContext,
          });
        }
      }
    }
  }

  return accumulatedContent;
};
