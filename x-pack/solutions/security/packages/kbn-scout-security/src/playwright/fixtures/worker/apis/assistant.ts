/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutParallelWorkerFixtures, EsClient } from '@kbn/scout';
import type { Page } from '@playwright/test';
import type {
  ConversationCategory,
  ConversationCreateProps,
  ConversationResponse,
} from '@kbn/elastic-assistant-common';
import type {
  PerformPromptsBulkActionRequestBody,
  PerformPromptsBulkActionResponse,
  PromptCreateProps,
} from '@kbn/elastic-assistant-common/impl/schemas';

// API endpoint constants
const ASSISTANT_CONVERSATIONS_API = '/api/security_ai_assistant/current_user/conversations';
const ASSISTANT_PROMPTS_BULK_API = '/api/security_ai_assistant/prompts/_bulk_action';

// Elasticsearch index pattern helpers
const getConversationsIndexPattern = (namespace: string = 'default') =>
  `.kibana-elastic-ai-assistant-conversations-${namespace}*`;
const getPromptsIndexPattern = (namespace: string = 'default') =>
  `.kibana-elastic-ai-assistant-prompts-${namespace}*`;

/**
 * Full Assistant API service interface.
 * Used for creating/reading user-scoped resources.
 */
export interface AssistantApiService {
  createConversation: (body?: Partial<ConversationCreateProps>) => Promise<ConversationResponse>;
  getConversation: (id: string) => Promise<ConversationResponse>;
  createPrompts: (
    prompts: Array<Partial<PromptCreateProps>>
  ) => Promise<PerformPromptsBulkActionResponse>;
}

/**
 * Cleanup-only Assistant API service interface.
 * Used for worker-scoped cleanup operations via ES direct access.
 */
export interface AssistantCleanupService {
  deleteAllConversations: () => Promise<void>;
  deleteAllPrompts: () => Promise<void>;
}

/**
 * Creates a cleanup service for AI Assistant resources.
 * This service uses direct ES access to delete all conversations/prompts.
 * Should be used in worker-scoped fixtures for test cleanup.
 *
 * @param esClient - Elasticsearch client for direct index access
 * @param scoutSpace - Optional space configuration for multi-space tests
 * @returns Cleanup service with delete methods
 */
export const getAssistantCleanupService = ({
  esClient,
  scoutSpace,
}: {
  esClient: EsClient;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): AssistantCleanupService => {
  const namespace = scoutSpace?.id || 'default';

  return {
    deleteAllConversations: async () => {
      const indexPattern = getConversationsIndexPattern(namespace);
      await esClient.deleteByQuery({
        index: indexPattern,
        ignore_unavailable: true,
        conflicts: 'proceed', // Continue even if there are version conflicts
        query: {
          match_all: {},
        },
        refresh: true,
      });

      // Poll to verify deletion completed (with exponential backoff)
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        try {
          const result = await esClient.count({
            index: indexPattern,
            ignore_unavailable: true,
          });
          if (result.count === 0) {
            break;
          }
        } catch {
          // Index might not exist - that's fine
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempts)));
        attempts++;
      }
    },

    deleteAllPrompts: async () => {
      const indexPattern = getPromptsIndexPattern(namespace);
      await esClient.deleteByQuery({
        index: indexPattern,
        ignore_unavailable: true,
        conflicts: 'proceed', // Continue even if there are version conflicts
        query: {
          match_all: {},
        },
        refresh: true,
      });

      // Poll to verify deletion completed (with exponential backoff)
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        try {
          const result = await esClient.count({
            index: indexPattern,
            ignore_unavailable: true,
          });
          if (result.count === 0) {
            break;
          }
        } catch {
          // Index might not exist - that's fine
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempts)));
        attempts++;
      }
    },
  };
};

/**
 * Creates a browser-scoped Assistant API service.
 * This service uses page.request which inherits the browser's authenticated session.
 * This ensures that user-scoped resources (conversations, prompts) are created
 * with the same user context as the logged-in browser user.
 *
 * IMPORTANT: Always use this service (not kbnClient-based) when creating
 * conversations or prompts that need to be visible in the UI.
 *
 * @param page - Playwright Page object (inherits browser authentication)
 * @param kbnUrl - Kibana base URL (from config.hosts.kibana)
 * @param scoutSpace - Optional space configuration for multi-space tests
 * @returns Full Assistant API service using browser user context
 */
export const getBrowserScopedAssistantService = ({
  page,
  kbnUrl,
  scoutSpace,
}: {
  page: Page;
  kbnUrl: string;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
}): AssistantApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace.id}` : '';

  return {
    createConversation: async (body = {}) => {
      const response = await page.request.post(
        `${kbnUrl}${basePath}${ASSISTANT_CONVERSATIONS_API}`,
        {
          headers: {
            'kbn-xsrf': 'true',
            'Content-Type': 'application/json',
          },
          data: {
            title: 'Test Conversation',
            excludeFromLastConversationStorage: false,
            messages: [],
            replacements: {},
            category: 'assistant' as ConversationCategory,
            ...body,
          },
          timeout: 30000,
        }
      );

      if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create conversation: ${response.status()} ${response.statusText()} - ${errorText}`
        );
      }

      return response.json();
    },

    getConversation: async (id: string) => {
      const response = await page.request.get(
        `${kbnUrl}${basePath}${ASSISTANT_CONVERSATIONS_API}/${id}`,
        {
          headers: {
            'kbn-xsrf': 'true',
          },
          timeout: 30000,
        }
      );

      if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(
          `Failed to get conversation: ${response.status()} ${response.statusText()} - ${errorText}`
        );
      }

      return response.json();
    },

    createPrompts: async (prompts: Array<Partial<PromptCreateProps>>) => {
      const response = await page.request.post(
        `${kbnUrl}${basePath}${ASSISTANT_PROMPTS_BULK_API}`,
        {
          headers: {
            'kbn-xsrf': 'true',
            'Content-Type': 'application/json',
          },
          data: {
            create: prompts.map((prompt) => ({
              name: 'Mock Prompt Name',
              promptType: 'quick' as const,
              content: 'Mock Prompt Content',
              consumer: 'securitySolutionUI',
              ...prompt,
            })),
          } as PerformPromptsBulkActionRequestBody,
          timeout: 30000,
        }
      );

      if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create prompts: ${response.status()} ${response.statusText()} - ${errorText}`
        );
      }

      return response.json();
    },
  };
};
