/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import * as z from '@kbn/zod/v4';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { RuleMigrationIntegration } from '../../../types';

const NAME = 'searchProductDocumentation' as const;

const DESCRIPTION =
  'Searches Elastic product documentation for migration guidance and integration-related context. Use this first for integration matching and fall back to direct integration search if unavailable or not useful.';

const SCHEMA = z.object({
  query: z.string().describe('A semantic query to search Elastic product documentation.'),
  product: z
    .enum(['kibana', 'elasticsearch', 'observability', 'security'])
    .optional()
    .describe('Optional product filter for documentation search.'),
});

export interface ProductDocumentationSearchResult {
  source: 'productDocumentation';
  query: string;
  available: boolean;
  hasUsefulResults: boolean;
  count: number;
  docs: Array<{ title: string; url: string; content: string; summarized: boolean }>;
  fallbackReason?: string;
  integrationHints?: Array<Pick<RuleMigrationIntegration, 'id' | 'title' | 'description'>>;
}

export const getProductDocumentationSearchTool = ({
  request,
  connectorId,
  llmTasks,
}: {
  request?: KibanaRequest;
  connectorId?: string;
  llmTasks?: LlmTasksPluginStart;
}) => {
  const searchProductDocumentation = async ({
    query,
    product,
  }: {
    query: string;
    product?: 'kibana' | 'elasticsearch' | 'observability' | 'security';
  }) => {
    if (!llmTasks) {
      return {
        source: 'productDocumentation',
        query,
        available: false,
        count: 0,
        hasUsefulResults: false,
        fallbackReason:
          'Product documentation tool is not available. LlmTasks plugin is not available.',
        docs: [],
      } satisfies ProductDocumentationSearchResult;
    }

    if (!request || !connectorId) {
      return {
        source: 'productDocumentation',
        query,
        available: false,
        count: 0,
        hasUsefulResults: false,
        fallbackReason: 'Product documentation tool is not configured for this migration run.',
        docs: [],
      } satisfies ProductDocumentationSearchResult;
    }

    const isAvailable = await llmTasks.retrieveDocumentationAvailable({
      inferenceId: defaultInferenceEndpoints.ELSER,
    });

    if (!isAvailable) {
      return {
        source: 'productDocumentation',
        query,
        available: false,
        count: 0,
        hasUsefulResults: false,
        fallbackReason:
          'Product documentation is not installed for this environment. Fallback to direct integration search is required.',
        docs: [],
      } satisfies ProductDocumentationSearchResult;
    }

    const docs = await llmTasks.retrieveDocumentation({
      searchTerm: query,
      products: product ? [product] : ['security'],
      max: 3,
      connectorId,
      request,
      inferenceId: defaultInferenceEndpoints.ELSER,
    });

    const documents = docs.documents ?? [];
    return {
      source: 'productDocumentation',
      query,
      available: true,
      count: documents.length,
      hasUsefulResults: documents.length > 0,
      docs: documents.map((document) => ({
        title: document.title,
        url: document.url,
        content: document.content,
        summarized: document.summarized,
      })),
    } satisfies ProductDocumentationSearchResult;
  };

  return {
    [NAME]: tool(searchProductDocumentation, {
      name: NAME,
      description: DESCRIPTION,
      schema: SCHEMA,
    }),
  };
};
