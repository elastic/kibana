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
import { toCounterUpdates } from './ranking';
import { type MemoryPage } from '../../common/memory';

const MAX_TRANSCRIPT_CHARS = 12_000;
const MAX_EXTRACTIONS = 3;

export const MEMORY_CRITIQUE_SYSTEM_PROMPT = `You are an impartial analyst-LLM.

**Objective**
Evaluate how retrieved *memory* affected an agent's work.

**Definitions**
- *Positive signal* ("helpful"): memory was quoted, aligned with, or enabled correct decisions.
- *Negative signal* ("harmful"): memory caused contradiction, wasted steps, or misinformation.
- Neutral / unused: omit.

Be conservative with labeling useful memories: only identify as useful if definitely helpful.`;

export const MEMORY_EXTRACT_SYSTEM_PROMPT = `You are a knowledge distillation engine for an AI SRE assistant. After each conversation you extract **1 to 3** reusable facts that would help the same assistant on a *similar but not exactly the same* task in this same customer environment in the future.

Focus strictly on durable, tool-output-verifiable knowledge about the customer's environment — how this organization's systems are structured and how its components behave. Do **not** extract generic tool, connector, or API usage — that belongs to the tool/connector's own documentation, not to per-customer memory.`;

export const MEMORY_EXTRACT_GUIDELINES = `Review the conversation. Extract only facts that are directly substantiated by the transcript.

**EXTRACT** — durable customer-environment knowledge:
- Organizational context: team ownership, on-call structure, service → team mapping, escalation paths, naming conventions.
- System component behavior: what a service/job does, its upstream/downstream dependencies, typical traffic/latency/error profile, known failure modes.
- Environment topology: how services are named in traces/logs/metrics, how environments (prod/stage/etc.) are labeled, which hosts/clusters/regions serve what role.

**NEVER EXTRACT:**
- Knowledge already present in the memories recalled for this session — re-extracting them just bloats the store.
- Common-sense or generic knowledge that isn't specific to this customer's environment (e.g. "Prometheus exposes /api/v1/query", "K8s pods restart on OOM").
- Connector/tool mechanics: hosts, auth methods, base paths, tenant IDs, API endpoint patterns, query syntax, request/response shapes.
- Generic "how to use X" tips that would apply to any customer running the same tool.
- "How we investigated this" narratives — capture the *facts* the investigation uncovered, not the procedure.
- Tool errors, broken environments, or workarounds for failures.
- Negation / absence ("X doesn't exist", "no doc found").
- Credentials, tokens, or secrets.
- Container internals (/proc, hex ports, Docker layers).
- Information only relevant to this specific request (e.g. the single alert fingerprint being investigated).

Keep entries concise. Return an empty list if the conversation produced no reusable environment knowledge.`;

export interface MemoryLabelProposal {
  useful: string[];
  harmful: string[];
}

export interface MemoryExtractProposal {
  slug: string;
  title: string;
  content: string;
  tags: string[];
  categories: string[];
}

export type ProposeMemoryLabels = (input: {
  transcript: string;
  recalledMemories: MemoryPage[];
}) => Promise<MemoryLabelProposal>;

export type ProposeMemoryExtractions = (input: {
  transcript: string;
  recalledMemories: MemoryPage[];
}) => Promise<MemoryExtractProposal[]>;

const formatRecalled = (recalledMemories: MemoryPage[]): string =>
  recalledMemories.length === 0
    ? '(none)'
    : recalledMemories
        .map(
          (mem) =>
            `- id=${mem.id} | title="${mem.title}" | content="${mem.content.substring(0, 150)}"`
        )
        .join('\n');

export const createLlmProposeMemoryLabels = ({
  inferenceClient,
  connectorId,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
}): ProposeMemoryLabels => {
  return async ({ transcript, recalledMemories }) => {
    const response = await inferenceClient.output({
      id: 'nightshift_memory_critique',
      connectorId,
      system: MEMORY_CRITIQUE_SYSTEM_PROMPT,
      input: `Evaluate the list of recalled memory per the system instructions.\n\nRecalled memories:\n${formatRecalled(
        recalledMemories
      )}\n\nInvestigation transcript:\n${transcript}`,
      schema: {
        type: 'object',
        properties: {
          useful: { type: 'array', items: { type: 'string' } },
          harmful: { type: 'array', items: { type: 'string' } },
        },
        required: ['useful', 'harmful'],
      },
    });

    return {
      useful: Array.isArray(response.output?.useful)
        ? response.output.useful.map((id: unknown) => String(id))
        : [],
      harmful: Array.isArray(response.output?.harmful)
        ? response.output.harmful.map((id: unknown) => String(id))
        : [],
    };
  };
};

export const createLlmProposeMemoryExtractions = ({
  inferenceClient,
  connectorId,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
}): ProposeMemoryExtractions => {
  return async ({ transcript, recalledMemories }) => {
    const response = await inferenceClient.output({
      id: 'nightshift_memory_extract',
      connectorId,
      system: MEMORY_EXTRACT_SYSTEM_PROMPT,
      input: `${MEMORY_EXTRACT_GUIDELINES}

Recalled memories (do not re-extract these):\n${formatRecalled(recalledMemories)}

Investigation transcript:\n${transcript}`,
      schema: {
        type: 'object',
        properties: {
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
        required: ['extractions'],
      },
    });

    const extractions = Array.isArray(response.output?.extractions)
      ? response.output.extractions
      : [];
    return extractions
      .map(
        (entry: {
          slug?: unknown;
          title?: unknown;
          content?: unknown;
          tags?: unknown;
          categories?: unknown;
        }) => ({
          slug: canonicalizeSlug(String(entry.slug ?? '')),
          title: String(entry.title ?? '').trim(),
          content: String(entry.content ?? '').trim(),
          tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
          categories: Array.isArray(entry.categories) ? entry.categories.map(String) : [],
        })
      )
      .filter(
        (entry: MemoryExtractProposal) =>
          entry.slug.length > 0 && entry.title.length > 0 && entry.content.length > 0
      )
      .slice(0, MAX_EXTRACTIONS);
  };
};

const looksLikeSecret = (value: string): boolean =>
  /(?:api[_-]?key|secret|password)\s*[:=]\s*\S+/i.test(value) ||
  /bearer\s+[a-z0-9._-]{12,}/i.test(value);

export const EXTRACTION_OVERLAP_THRESHOLD = 0.8;

export const normalizeMemoryTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokens = (text: string): Set<string> =>
  new Set(
    normalizeMemoryTitle(text)
      .split(' ')
      .filter((token) => token.length > 2)
  );

/** Fraction of the smaller token set shared by both strings. */
export const contentOverlap = (left: string, right: string): number => {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }
  return intersection / Math.min(leftTokens.size, rightTokens.size);
};

type ExtractionPage = Pick<MemoryPage, 'id' | 'slug' | 'title' | 'content'>;

export const isDuplicateExtraction = ({
  extra,
  recalledIds,
  recalledMemories,
  catalogHits,
}: {
  extra: MemoryExtractProposal;
  recalledIds: readonly string[];
  recalledMemories: readonly ExtractionPage[];
  catalogHits: readonly ExtractionPage[];
}): boolean => {
  const extraId = toMemoryKiId(extra.slug);
  const extraSlug = canonicalizeSlug(extra.slug);
  const extraTitle = normalizeMemoryTitle(extra.title);
  const extraText = `${extra.title}\n${extra.content}`;

  const recalled = new Set(recalledIds);
  if (
    recalled.has(extraId) ||
    [...recalled].some((id) => id.replace(/^memory_/, '') === extraSlug)
  ) {
    return true;
  }

  const matches = (page: ExtractionPage, allowSameSlug: boolean): boolean => {
    const samePage = page.id === extraId || page.slug === extraSlug;
    if (samePage) {
      return !allowSameSlug;
    }
    if (extraTitle.length > 0 && normalizeMemoryTitle(page.title) === extraTitle) {
      return true;
    }
    return (
      contentOverlap(extraText, `${page.title}\n${page.content}`) >= EXTRACTION_OVERLAP_THRESHOLD
    );
  };

  return (
    recalledMemories.some((page) => matches(page, false)) ||
    catalogHits.some((page) => matches(page, true))
  );
};

export const applyMemoryEdits = async ({
  store,
  recalledIds,
  recalledMemories = [],
  labels,
  extractions,
  logger,
}: {
  store: MemoryPageStore;
  recalledIds: string[];
  recalledMemories?: ExtractionPage[];
  labels: MemoryLabelProposal;
  extractions: MemoryExtractProposal[];
  logger: Logger;
}): Promise<void> => {
  const recalled = new Set(recalledIds);
  const { archiveIds, updates } = toCounterUpdates({
    impressionIds: recalledIds,
    usefulIds: labels.useful.filter((id) => recalled.has(id)),
    harmfulIds: labels.harmful.filter((id) => recalled.has(id)),
  });

  for (const id of archiveIds) {
    await store.archive(id);
  }
  await store.applyCounterUpdates(updates);

  for (const extra of extractions) {
    if (looksLikeSecret(`${extra.title}\n${extra.content}`)) {
      logger.warn(`Skipped extraction "${extra.slug}" — content looks like a secret`);
      continue;
    }

    const catalogHits = (await store.retrieve({ query: extra.title, size: 5 })) ?? [];
    if (
      isDuplicateExtraction({
        extra,
        recalledIds,
        recalledMemories,
        catalogHits,
      })
    ) {
      logger.debug(`Skipped extraction "${extra.slug}" — overlaps recalled or catalog memory`);
      continue;
    }

    try {
      const existing = await store.get(toMemoryKiId(extra.slug));
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
      logger.info(`Extracted new memory page: ${extra.slug}`);
    } catch (err) {
      logger.warn(`Failed to extract memory "${extra.slug}": ${(err as Error).message}`);
    }
  }
};

export const optimizeMemory = async ({
  store,
  recalledIds,
  proposeLabels,
  proposeExtractions,
  userMessage,
  assistantMessage,
  logger,
}: {
  store: MemoryPageStore;
  recalledIds: string[];
  proposeLabels: ProposeMemoryLabels;
  proposeExtractions: ProposeMemoryExtractions;
  userMessage: string;
  assistantMessage: string;
  logger: Logger;
}): Promise<void> => {
  if (recalledIds.length === 0 && assistantMessage.trim().length === 0) {
    logger.debug('Memory optimizer skipped — no recalled memories and empty assistant message');
    return;
  }

  const recalledMemories = (await Promise.all(recalledIds.map((id) => store.get(id)))).filter(
    (page): page is MemoryPage => page !== undefined
  );

  const transcript = [
    '## User',
    userMessage.slice(0, MAX_TRANSCRIPT_CHARS),
    '',
    '## Assistant',
    assistantMessage.slice(0, MAX_TRANSCRIPT_CHARS),
  ].join('\n');

  const labels =
    recalledMemories.length === 0
      ? { useful: [], harmful: [] }
      : await proposeLabels({ transcript, recalledMemories });

  // Cold-start rounds have an empty recalled set; still extract or the store never fills.
  const shouldExtract = assistantMessage.trim().length > 0;
  const extractions = shouldExtract
    ? await proposeExtractions({ transcript, recalledMemories })
    : [];

  if (
    labels.useful.length === 0 &&
    labels.harmful.length === 0 &&
    extractions.length === 0 &&
    recalledIds.length === 0
  ) {
    logger.debug('Memory optimizer proposed no edits');
    return;
  }

  await applyMemoryEdits({
    store,
    recalledIds,
    recalledMemories,
    labels,
    extractions,
    logger,
  });
};
