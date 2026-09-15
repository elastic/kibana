/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import type { MemoryPageStore } from './page_store';
import { toMemoryKiId, canonicalizeSlug } from './page_store';
import { type MemoryPage } from '../../common/memory';

const MAX_TRANSCRIPT_CHARS = 12_000;
const MAX_PROPOSALS = 8;

export interface MemoryRatingProposal {
  id: string;
  is_useful: boolean;
}

export interface MemoryExtractProposal {
  slug: string;
  title: string;
  content: string;
  tags: string[];
  categories: string[];
}

export interface MemoryOptimizeProposal {
  ratings: MemoryRatingProposal[];
  extractions: MemoryExtractProposal[];
}

export type ProposeMemoryEdits = (input: {
  transcript: string;
  recalledMemories: MemoryPage[];
}) => Promise<MemoryOptimizeProposal>;

export const createLlmProposeMemoryEdits = ({
  inferenceClient,
  connectorId,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
}): ProposeMemoryEdits => {
  return async ({ transcript, recalledMemories }) => {
    const recalledList =
      recalledMemories.length === 0
        ? '(none)'
        : recalledMemories
            .map((mem) => `- id=${mem.id} | title="${mem.title}" | content="${mem.content.substring(0, 150)}..."`)
            .join('\n');

    const response = await inferenceClient.output({
      id: 'nightshift_memory_optimize',
      connectorId,
      system: `You maintain a Semantic Memory store of prior incidents, failure signatures, and operational learnings.
Review the investigation transcript and the list of recalled memories that were loaded into the context.
      
Evaluate:
1. Ratings: For each recalled memory, decide whether it was actually useful and helped resolve or guide the assistant's investigation, or if it was just noise.
2. Extractions: If something durable, highly reusable, and generic was learned that isn't already covered in the memories, propose a new memory entry to extract.

Rules:
- "is_useful": true only if the memory directly guided or resolved the problem. False if irrelevant or ignored.
- "extractions": Propose only highly generic and reusable lessons (e.g. error signatures, specific tool resolutions). Keep content short and clear.`,
      input: `Recalled Memories:\n${recalledList}\n\nInvestigation Transcript:\n${transcript}`,
      schema: {
        type: 'object',
        properties: {
          ratings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                is_useful: { type: 'boolean' },
              },
              required: ['id', 'is_useful'],
            },
          },
          extractions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slug: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                categories: { type: 'array', items: { type: 'string' } },
              },
              required: ['slug', 'title', 'content'],
            },
          },
        },
        required: ['ratings', 'extractions'],
      },
    });

    const ratings = Array.isArray(response.output?.ratings) ? response.output.ratings : [];
    const extractions = Array.isArray(response.output?.extractions) ? response.output.extractions : [];

    return {
      ratings: ratings.map((r: any) => ({
        id: String(r.id),
        is_useful: Boolean(r.is_useful),
      })).slice(0, MAX_PROPOSALS),
      extractions: extractions.map((e: any) => ({
        slug: canonicalizeSlug(String(e.slug)),
        title: String(e.title).trim(),
        content: String(e.content),
        tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
        categories: Array.isArray(e.categories) ? e.categories.map(String) : [],
      })).slice(0, MAX_PROPOSALS),
    };
  };
};

export const applyMemoryEdits = async ({
  store,
  edits,
  logger,
}: {
  store: MemoryPageStore;
  edits: MemoryOptimizeProposal;
  logger: Logger;
}): Promise<void> => {
  // 1. Process Ratings updates (impressions/conversions increments)
  for (const rating of edits.ratings) {
    const existing = await store.get(rating.id);
    if (!existing) continue;

    if (rating.is_useful) {
      const updated = await store.corroborate(rating.id);
      if (updated) {
        logger.info(`Corroborated and incremented usefulness rating for memory ${rating.id}`);
      }
    } else {
      // Increments impressions (+1) and decays telemetry natively
      await store.upsert({
        slug: existing.slug,
        title: existing.title,
        description: existing.description,
        content: existing.content,
        tags: existing.tags,
        categories: existing.categories,
        references: existing.references,
        status: existing.status,
        telemetry: {
          impressions: existing.telemetry.impressions + 1.0,
          conversions: existing.telemetry.conversions,
          last_impression_time: new Date().toISOString(),
        },
        user: existing.updated_by,
      });
      logger.info(`Incremented impression counter for memory ${rating.id}`);
    }
  }

  // 2. Process newly extracted memories
  for (const extra of edits.extractions) {
    const id = toMemoryKiId(extra.slug);
    try {
      const existing = await store.get(id);
      await store.upsert({
        slug: extra.slug,
        title: extra.title,
        content: extra.content,
        tags: extra.tags,
        categories: extra.categories,
        references: [],
        status: existing?.status ?? 'tentative',
        user: 'nightshift-optimizer',
      });
      logger.info(`Successfully extracted and created new memory page: ${extra.slug}`);
    } catch (err) {
      logger.warn(`Failed to extract memory "${extra.slug}": ${(err as Error).message}`);
    }
  }
};

/**
 * Parallel Memory Optimizer.
 * Analyzes the round transcript, runs LLM-driven memory evaluation,
 * and updates decaying ratings (impressions/conversions) natively post-round.
 */
export const optimizeMemory = async ({
  store,
  proposeEdits,
  userMessage,
  assistantMessage,
  logger,
}: {
  store: MemoryPageStore;
  proposeEdits: ProposeMemoryEdits;
  userMessage: string;
  assistantMessage: string;
  logger: Logger;
}): Promise<void> => {
  const { pages: allMemories } = await store.list();
  const transcript = [
    '## User',
    userMessage.slice(0, MAX_TRANSCRIPT_CHARS),
    '',
    '## Assistant',
    assistantMessage.slice(0, MAX_TRANSCRIPT_CHARS),
  ].join('\n');

  const edits = await proposeEdits({ transcript, recalledMemories: allMemories });
  if (edits.ratings.length === 0 && edits.extractions.length === 0) {
    logger.debug('Memory optimizer proposed no edits');
    return;
  }

  await applyMemoryEdits({ store, edits, logger });
};
