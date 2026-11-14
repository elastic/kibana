/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition, KibanaApiCallError } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  aesopCaptureDatasetInputSchema,
  aesopCaptureDatasetStepCommonDefinition,
} from '../../../../common/workflows/step_types/aesop_capture_dataset/aesop_capture_dataset_step_common';
import type { CapturedConversation, CapturedExample } from './capture_dataset';
import { conversationToExamples, dedupeExamples } from './capture_dataset';

const INTERNAL_VERSION_HEADERS = { 'elastic-api-version': '1' };
const PUBLIC_VERSION_HEADERS = { 'elastic-api-version': '2023-10-31' };
const CONVERSATION_PATH = '/api/agent_builder/conversations';
const DATASETS_PATH = '/internal/evals/datasets';

// The public list route has no free-text search, so the title filter runs here
// over a bounded window: at most LIST_MAX_PAGES pages of LIST_PAGE_SIZE.
const LIST_PAGE_SIZE = 100;
const LIST_MAX_PAGES = 5;

interface ListedConversation {
  id: string;
  title?: string;
}

const listMatchingConversations = async ({
  context,
  agentId,
  query,
  limit,
}: {
  context: StepHandlerContext;
  agentId: string;
  query: string;
  limit: number;
}): Promise<ListedConversation[]> => {
  const { callKibanaApi } = context.contextManager;
  const needle = query.toLowerCase();
  const matches: ListedConversation[] = [];
  for (let page = 1; page <= LIST_MAX_PAGES && matches.length < limit; page++) {
    const listed = await callKibanaApi<{
      results: ListedConversation[];
      pagination?: { total: number };
    }>({
      method: 'GET',
      path: CONVERSATION_PATH,
      query: { agent_id: agentId, page, per_page: LIST_PAGE_SIZE },
      headers: PUBLIC_VERSION_HEADERS,
    });
    const { results, pagination } = listed.body;
    for (const conversation of results) {
      if (conversation.title?.toLowerCase().includes(needle)) matches.push(conversation);
    }
    if (
      results.length < LIST_PAGE_SIZE ||
      (pagination && page * LIST_PAGE_SIZE >= pagination.total)
    ) {
      break;
    }
  }
  return matches.slice(0, limit);
};

interface ExistingDataset {
  id: string;
  examples: CapturedExample[];
}

const pickExample = ({ input, output, metadata }: CapturedExample): CapturedExample => ({
  ...(input ? { input } : {}),
  ...(output ? { output } : {}),
  ...(metadata ? { metadata } : {}),
});

const loadExistingDataset = async (
  context: StepHandlerContext,
  name: string
): Promise<ExistingDataset | undefined> => {
  const { callKibanaApi } = context.contextManager;
  try {
    const resolved = await callKibanaApi<{ id: string }>({
      method: 'GET',
      path: `${DATASETS_PATH}/_resolve`,
      query: { name },
      headers: INTERNAL_VERSION_HEADERS,
    });
    const dataset = await callKibanaApi<{ id: string; examples: CapturedExample[] }>({
      method: 'GET',
      path: `${DATASETS_PATH}/${encodeURIComponent(resolved.body.id)}`,
      headers: INTERNAL_VERSION_HEADERS,
    });
    return { id: dataset.body.id, examples: dataset.body.examples.map(pickExample) };
  } catch (error) {
    if (error instanceof KibanaApiCallError && error.status === 404) return undefined;
    throw error;
  }
};

export const aesopCaptureDatasetStepDefinition = createServerStepDefinition({
  ...aesopCaptureDatasetStepCommonDefinition,
  handler: async (context) => {
    const parsed = aesopCaptureDatasetInputSchema.safeParse(context.input);
    if (!parsed.success) {
      return { error: new Error(`Invalid input: ${parsed.error.message}`) };
    }
    const input = parsed.data;
    const { callKibanaApi } = context.contextManager;

    try {
      const matches = await listMatchingConversations({
        context,
        agentId: input.agent_id,
        query: input.query,
        limit: input.max_conversations,
      });

      // The list entries carry no rounds, so each conversation is read in full.
      const captured: CapturedExample[] = [];
      let conversationsRead = 0;
      for (const hit of matches) {
        const conversation = await callKibanaApi<CapturedConversation>({
          method: 'GET',
          path: `${CONVERSATION_PATH}/${encodeURIComponent(hit.id)}`,
          headers: PUBLIC_VERSION_HEADERS,
        });
        conversationsRead += 1;
        captured.push(...conversationToExamples(conversation.body));
      }

      const existing = await loadExistingDataset(context, input.dataset_name);
      const { kept, skipped } = dedupeExamples({
        existing: existing?.examples ?? [],
        captured,
        threshold: input.similarity_threshold,
      });

      if (kept.length === 0) {
        return {
          output: {
            dataset_id: existing?.id ?? null,
            conversations_read: conversationsRead,
            captured: captured.length,
            skipped_duplicates: skipped,
            added: 0,
            removed: 0,
            unchanged: existing?.examples.length ?? 0,
          },
        };
      }

      // Upsert replaces the example set, so the existing examples travel with the new ones.
      const upsert = await callKibanaApi<{
        dataset_id: string;
        added: number;
        removed: number;
        unchanged: number;
      }>({
        method: 'POST',
        path: `${DATASETS_PATH}/_upsert`,
        headers: INTERNAL_VERSION_HEADERS,
        body: {
          name: input.dataset_name,
          description: input.dataset_description,
          tags: input.tags,
          examples: [...(existing?.examples ?? []), ...kept],
        },
      });

      return {
        output: {
          dataset_id: upsert.body.dataset_id,
          conversations_read: conversationsRead,
          captured: captured.length,
          skipped_duplicates: skipped,
          added: upsert.body.added,
          removed: upsert.body.removed,
          unchanged: upsert.body.unchanged,
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
});
