/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { formatPageRefs, previewText } from './log_format';
import type { MemoryPageStore } from './page_store';
import {
  canonicalizeSlug,
  epochSecondsToIso,
  toMemoryDisplayTelemetry,
  toMemoryKiId,
} from './page_store';
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

Be conservative with labeling useful memories: only identify as useful if definitely helpful.

Return only recalled memory ids (the id= value, e.g. memory_checkout-redis-evictions). Never titles, content, or the full recalled line.`;

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

export interface MemoryExtractionBatch {
  extractions: MemoryExtractProposal[];
  /** Recalled ids the model says are the same fact. Each inner list is one group. */
  mergeTargets: string[][];
}

export interface MemoryMergeSynthesis {
  title: string;
  content: string;
  context: string;
}

export interface MemoryEditSummary {
  usefulCount: number;
  harmfulCount: number;
  extractionProposedCount: number;
  standaloneUpsertCount: number;
  safetySkipCount: number;
  mergeAttemptCount: number;
  mergeSuccessCount: number;
  harmfulArchiveCount: number;
  mergedSourceArchiveCount: number;
  writeFailureCount: number;
}

export interface MemoryOptimizeSummary extends MemoryEditSummary {
  recalledCount: number;
  loadedCount: number;
}

const emptyMemoryEditSummary = (): MemoryEditSummary => ({
  usefulCount: 0,
  harmfulCount: 0,
  extractionProposedCount: 0,
  standaloneUpsertCount: 0,
  safetySkipCount: 0,
  mergeAttemptCount: 0,
  mergeSuccessCount: 0,
  harmfulArchiveCount: 0,
  mergedSourceArchiveCount: 0,
  writeFailureCount: 0,
});

export type ProposeMemoryExtractions = (input: {
  transcript: string;
  recalledMemories: MemoryPage[];
}) => Promise<MemoryExtractionBatch>;

export type SynthesizeMemoryGroup = (input: {
  sources: MemoryPage[];
  extract?: MemoryExtractProposal;
  task?: string;
}) => Promise<MemoryMergeSynthesis>;

/** Drop a trailing `<system_update>` so extract `context` stays the original task. */
export const unwrapUserTask = (prompt: string | undefined): string => {
  if (!prompt) {
    return '';
  }
  const tag = prompt.search(/<system_update>/);
  return (tag === -1 ? prompt : prompt.slice(0, tag)).trim();
};

export const MERGED_CONTENT_MAX_CHARS = 3000;

export const capMergedContent = (content: string, maxChars = MERGED_CONTENT_MAX_CHARS): string => {
  if (maxChars <= 0 || content.length <= maxChars) {
    return content;
  }
  const suffix = '\n\n…(truncated)';
  const budget = Math.max(1, maxChars - suffix.length);
  let head = content.slice(0, budget);
  const window = head.slice(-200);
  for (const delim of ['\n\n', '. ', '\n']) {
    const idx = window.lastIndexOf(delim);
    if (idx >= 0) {
      head = head.slice(0, budget - window.length + idx + delim.length).trimEnd();
      break;
    }
  }
  return head + suffix;
};

export const MAX_FORMATTED_RECALLED_CHARS = 32_000;

export const formatRecalled = (recalledMemories: readonly MemoryPage[]): string => {
  if (recalledMemories.length === 0) {
    return '(none)';
  }
  let output = '';
  for (const memory of recalledMemories) {
    const separator = output.length === 0 ? '' : '\n';
    const prefix =
      `${separator}- id=${memory.id}\n  title: ${memory.title}\n` +
      `  context: ${memory.context ?? ''}\n  content: `;
    const remaining = MAX_FORMATTED_RECALLED_CHARS - output.length;
    if (prefix.length > remaining) {
      break;
    }
    const contentBudget = remaining - prefix.length;
    output += prefix + memory.content.slice(0, contentBudget);
    if (memory.content.length > contentBudget) {
      break;
    }
  }
  return output;
};

/** Pull a page id out of a critique string. LLMs often echo `id=memory_x | title=…`. */
const MEMORY_LABEL_ID_RE = /\bmemory_[a-z0-9-]{1,80}\b/i;

export const canonicalizeMemoryLabelId = (raw: string): string | undefined => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const fromEq = /(?:^|[|\s,])id\s*=\s*(memory_[a-z0-9-]+)/i.exec(` ${trimmed}`);
  if (fromEq) {
    return fromEq[1];
  }
  if (/^memory_[a-z0-9-]+$/i.test(trimmed)) {
    return trimmed;
  }
  const embedded = MEMORY_LABEL_ID_RE.exec(trimmed);
  return embedded ? embedded[0] : undefined;
};

export const canonicalizeMemoryLabelIds = (raw: readonly string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const id = canonicalizeMemoryLabelId(value);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
};

export const createLlmProposeMemoryLabels = ({
  inferenceClient,
}: {
  inferenceClient: BoundInferenceClient;
}): ProposeMemoryLabels => {
  return async ({ transcript, recalledMemories }) => {
    const response = await inferenceClient.output({
      id: 'nightshift_memory_critique',
      system: MEMORY_CRITIQUE_SYSTEM_PROMPT,
      input: `Evaluate the list of recalled memory per the system instructions.\n\nRecalled memories:\n${formatRecalled(
        recalledMemories
      )}\n\nInvestigation transcript:\n${transcript}`,
      schema: {
        type: 'object',
        properties: {
          useful: {
            type: 'array',
            items: { type: 'string' },
            description: 'Recalled memory ids only, e.g. memory_checkout-redis-evictions.',
          },
          harmful: {
            type: 'array',
            items: { type: 'string' },
            description: 'Recalled memory ids only, e.g. memory_checkout-redis-evictions.',
          },
        },
        required: ['useful', 'harmful'],
      },
    });

    return {
      useful: canonicalizeMemoryLabelIds(
        Array.isArray(response.output?.useful)
          ? response.output.useful.map((id: unknown) => String(id))
          : []
      ),
      harmful: canonicalizeMemoryLabelIds(
        Array.isArray(response.output?.harmful)
          ? response.output.harmful.map((id: unknown) => String(id))
          : []
      ),
    };
  };
};

export const createLlmProposeMemoryExtractions = ({
  inferenceClient,
}: {
  inferenceClient: BoundInferenceClient;
}): ProposeMemoryExtractions => {
  return async ({ transcript, recalledMemories }) => {
    const response = await inferenceClient.output({
      id: 'nightshift_memory_extract',
      system: MEMORY_EXTRACT_SYSTEM_PROMPT,
      input: `${MEMORY_EXTRACT_GUIDELINES}

If two or more recalled memories state the same fact, add each group to merge_targets as {"ids":["memory_a","memory_b"]}. Otherwise return an empty merge_targets.

Recalled memories (do not re-extract these):\n${formatRecalled(recalledMemories)}

Investigation transcript:\n${transcript}`,
      schema: {
        type: 'object',
        properties: {
          merge_targets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ids: { type: 'array', items: { type: 'string' } },
              },
              required: ['ids'],
            },
            description: 'Groups of recalled memory ids that say the same thing.',
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
        required: ['extractions'],
      },
    });

    const extractions: unknown[] = Array.isArray(response.output?.extractions)
      ? response.output.extractions
      : [];
    return {
      mergeTargets: normalizeMergeTargets(response.output?.merge_targets),
      extractions: extractions
        .map((entry) => {
          const candidate =
            typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : {};
          return {
            slug: canonicalizeSlug(String(candidate.slug ?? '')),
            title: String(candidate.title ?? '').trim(),
            content: String(candidate.content ?? '').trim(),
            tags: Array.isArray(candidate.tags) ? candidate.tags.map(String) : [],
            categories: Array.isArray(candidate.categories) ? candidate.categories.map(String) : [],
          };
        })
        .filter(
          (entry: MemoryExtractProposal) =>
            entry.slug.length > 0 && entry.title.length > 0 && entry.content.length > 0
        )
        .slice(0, MAX_EXTRACTIONS),
    };
  };
};

const normalizeMergeTargets = (raw: unknown): string[][] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const groups = raw.every((item) => typeof item === 'string')
    ? [raw.map((id) => String(id))]
    : raw.flatMap((item) => {
        if (Array.isArray(item)) {
          return [item.map((id: unknown) => String(id))];
        }
        if (typeof item === 'object' && item !== null) {
          const ids = (item as { ids?: unknown }).ids;
          return Array.isArray(ids) ? [ids.map((id: unknown) => String(id))] : [];
        }
        return [];
      });
  return groups
    .map((group) => canonicalizeMemoryLabelIds(group))
    .filter((group) => group.length >= 2);
};

export const MEMORY_MERGE_SYSTEM_PROMPT = `You merge overlapping semantic memories into one canonical page.

Return title, markdown content, and context.
context is the recall key: compact, semantically rich phrases covering the union of the sources' task and goal descriptors. Not verbatim sentences. Not a concatenation of full prompts. Not one source's task copied when the others differ.
If you cannot write a non-empty context that covers that union, return an empty context string.`;

export const MAX_FORMATTED_MERGE_CHARS = 32_000;

export const formatMemoryMergeSources = ({
  sources,
  extract,
}: {
  sources: readonly MemoryPage[];
  extract?: MemoryExtractProposal;
}): string => {
  const entries = [
    ...sources.map((page) => ({
      prefix: `- id=${page.id}\n  title: ${page.title}\n  context: ${
        page.context ?? ''
      }\n  content: `,
      content: page.content,
    })),
    ...(extract
      ? [
          {
            prefix: `\n\nNew extract to fold in:\n- slug=${extract.slug}\n  title: ${extract.title}\n  content: `,
            content: extract.content,
          },
        ]
      : []),
  ];
  let output = '';
  for (const entry of entries) {
    const separator = output.length === 0 ? '' : '\n';
    const prefix = separator + entry.prefix;
    const remaining = MAX_FORMATTED_MERGE_CHARS - output.length;
    if (prefix.length > remaining) {
      break;
    }
    const contentBudget = remaining - prefix.length;
    output += prefix + entry.content.slice(0, contentBudget);
    if (entry.content.length > contentBudget) {
      break;
    }
  }
  return output;
};

export const createLlmSynthesizeMemoryGroup = ({
  inferenceClient,
}: {
  inferenceClient: BoundInferenceClient;
}): SynthesizeMemoryGroup => {
  return async ({ sources, extract, task }) => {
    const sourceAndExtractBlock = formatMemoryMergeSources({ sources, extract });
    const taskBlock =
      extract && task
        ? `\n\nThis round's original task (cover its goal in context; do not copy it verbatim): ${task}`
        : '';
    const response = await inferenceClient.output({
      id: 'nightshift_memory_merge',
      system: MEMORY_MERGE_SYSTEM_PROMPT,
      input: `Sources:\n${sourceAndExtractBlock}${taskBlock}`,
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          context: { type: 'string' },
        },
        required: ['title', 'content', 'context'],
      },
    });
    return {
      title: String(response.output?.title ?? '').trim(),
      content: String(response.output?.content ?? '').trim(),
      context: String(response.output?.context ?? '').trim(),
    };
  };
};

const looksLikeSecret = (value: string): boolean =>
  /(?:api[_-]?key|secret|password)\s*[:=]\s*\S+/i.test(value) ||
  /bearer\s+[a-z0-9._-]{12,}/i.test(value);

const extractionSafetyText = (extra: MemoryExtractProposal, task: string): string =>
  [extra.title, extra.content, extra.tags.join('\n'), extra.categories.join('\n'), task].join('\n');

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

  const matches = (page: ExtractionPage): boolean => {
    const samePage = page.id === extraId || page.slug === extraSlug;
    if (samePage) {
      return true;
    }
    if (extraTitle.length > 0 && normalizeMemoryTitle(page.title) === extraTitle) {
      return true;
    }
    return (
      contentOverlap(extraText, `${page.title}\n${page.content}`) >= EXTRACTION_OVERLAP_THRESHOLD
    );
  };

  return (
    recalledMemories.some((page) => matches(page)) || catalogHits.some((page) => matches(page))
  );
};

const liveOverlapPages = ({
  extra,
  recalledIds,
  recalledMemories,
  catalogHits,
}: {
  extra: MemoryExtractProposal;
  recalledIds: readonly string[];
  recalledMemories: readonly MemoryPage[];
  catalogHits: readonly MemoryPage[];
}): MemoryPage[] => {
  const extraId = toMemoryKiId(extra.slug);
  const extraSlug = canonicalizeSlug(extra.slug);
  const seen = new Set<string>();
  const out: MemoryPage[] = [];
  const push = (page: MemoryPage | undefined) => {
    if (!page || page.status === 'archived' || seen.has(page.id)) {
      return;
    }
    seen.add(page.id);
    out.push(page);
  };

  const recalled = new Set(recalledIds);
  if (
    recalled.has(extraId) ||
    [...recalled].some((id) => id.replace(/^memory_/, '') === extraSlug)
  ) {
    push(recalledMemories.find((page) => page.id === extraId || page.slug === extraSlug));
  }

  const extraTitle = normalizeMemoryTitle(extra.title);
  const extraText = `${extra.title}\n${extra.content}`;
  const matches = (page: ExtractionPage): boolean => {
    const samePage = page.id === extraId || page.slug === extraSlug;
    if (samePage) {
      return true;
    }
    if (extraTitle.length > 0 && normalizeMemoryTitle(page.title) === extraTitle) {
      return true;
    }
    return (
      contentOverlap(extraText, `${page.title}\n${page.content}`) >= EXTRACTION_OVERLAP_THRESHOLD
    );
  };

  for (const page of recalledMemories) {
    if (matches(page)) {
      push(page);
    }
  }
  for (const page of catalogHits) {
    if (matches(page)) {
      push(page);
    }
  }
  return out;
};

const unionStrings = (...groups: Array<readonly string[] | undefined>): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const value of group ?? []) {
      if (!value || seen.has(value)) {
        continue;
      }
      seen.add(value);
      out.push(value);
    }
  }
  return out;
};

const unionPages = (...groups: Array<readonly MemoryPage[]>): MemoryPage[] => {
  const order: string[] = [];
  const byId = new Map<string, MemoryPage>();
  for (const group of groups) {
    for (const page of group) {
      if (!byId.has(page.id)) {
        order.push(page.id);
      }
      byId.set(page.id, page);
    }
  }
  return order.flatMap((id) => {
    const page = byId.get(id);
    return page ? [page] : [];
  });
};

export const applyMemoryEdits = async ({
  store,
  recalledIds,
  recalledMemories = [],
  labels,
  extractions,
  mergeTargets = [],
  context,
  synthesizeMemoryGroup,
  now = () => Date.now() / 1000,
  logger,
}: {
  store: MemoryPageStore;
  recalledIds: string[];
  recalledMemories?: MemoryPage[];
  labels: MemoryLabelProposal;
  extractions: MemoryExtractProposal[];
  mergeTargets?: string[][];
  /** Current user task — stored on new pages as the recall key. */
  context?: string;
  synthesizeMemoryGroup?: SynthesizeMemoryGroup;
  now?: () => number;
  logger: Logger;
}): Promise<MemoryEditSummary> => {
  const recalled = new Set(recalledIds);
  const usefulIds = canonicalizeMemoryLabelIds(labels.useful).filter((id) => recalled.has(id));
  const harmfulIds = canonicalizeMemoryLabelIds(labels.harmful).filter((id) => recalled.has(id));
  const summary: MemoryEditSummary = {
    ...emptyMemoryEditSummary(),
    usefulCount: usefulIds.length,
    harmfulCount: harmfulIds.length,
    extractionProposedCount: extractions.length,
  };
  const droppedUseful = canonicalizeMemoryLabelIds(labels.useful).filter((id) => !recalled.has(id));
  const droppedHarmful = canonicalizeMemoryLabelIds(labels.harmful).filter(
    (id) => !recalled.has(id)
  );
  const { archiveIds, updates } = toCounterUpdates({
    impressionIds: recalledIds,
    usefulIds,
    harmfulIds,
  });
  logger.info(
    `Memory labels useful=${labels.useful.length} harmful=${labels.harmful.length}; ` +
      `archiving ${archiveIds.length}, counter updates ${updates.length}, ` +
      `extractions ${extractions.length}`
  );
  logger.debug(
    `Memory label apply useful=[${usefulIds.join(', ') || '(none)'}] ` +
      `harmful=[${harmfulIds.join(', ') || '(none)'}] ` +
      `droppedUseful=[${droppedUseful.join(', ') || '(none)'}] ` +
      `droppedHarmful=[${droppedHarmful.join(', ') || '(none)'}] ` +
      `archive=[${archiveIds.join(', ') || '(none)'}] ` +
      `counters=${
        updates.length === 0
          ? '(none)'
          : updates
              .map((update) => `${update.id}+imp=${update.addImp}+conv=${update.addConv}`)
              .join(',')
      } ` +
      `extractContext=${JSON.stringify(previewText(context))}`
  );

  const harmful = new Set(harmfulIds);
  for (const id of archiveIds) {
    await store.archive(id, 'harmful');
    summary.harmfulArchiveCount += 1;
    logger.debug(`Memory archived ${id} reason=harmful`);
  }
  await store.applyCounterUpdates(updates);

  const task = unwrapUserTask(context);
  const consumedIds = new Set<string>();
  const consumedExtracts = new Set<number>();

  interface MergeGroup {
    sourceIds: string[];
    extract?: MemoryExtractProposal;
    canonicalId?: string;
  }
  const groups: MergeGroup[] = [];

  for (let index = 0; index < extractions.length; index++) {
    const extra = extractions[index];
    logger.debug(
      `Memory extraction candidate slug=${extra.slug} title=${JSON.stringify(
        previewText(extra.title, 80)
      )} content=${JSON.stringify(previewText(extra.content))} ` +
        `tags=${extra.tags.join(',') || '(none)'}`
    );
    if (looksLikeSecret(extractionSafetyText(extra, task))) {
      logger.warn('Skipped a memory extraction because proposed content looks secret');
      logger.debug(`Memory extraction safety skip slug=${extra.slug}`);
      summary.safetySkipCount += 1;
      consumedExtracts.add(index);
      continue;
    }

    const exactId = toMemoryKiId(extra.slug);
    const exactPage = await store.get(exactId);
    if (exactPage?.status === 'archived') {
      logger.debug(`Skipped extraction "${extra.slug}" — exact slug is archived`);
      consumedExtracts.add(index);
      continue;
    }
    const catalogHits =
      (await store.retrieve({ query: extra.title, size: 5, match: 'content' })) ?? [];
    const overlaps = liveOverlapPages({
      extra,
      recalledIds,
      recalledMemories,
      catalogHits: exactPage ? [exactPage, ...catalogHits] : catalogHits,
    }).filter((page) => !consumedIds.has(page.id));
    if (overlaps.some((page) => harmful.has(page.id))) {
      logger.debug(`Skipped extraction "${extra.slug}" — merge group includes a harmful memory`);
      consumedExtracts.add(index);
      continue;
    }
    const live = overlaps;
    if (live.length === 0) {
      continue;
    }
    for (const page of live) {
      consumedIds.add(page.id);
    }
    consumedExtracts.add(index);
    groups.push({
      sourceIds: live.map((page) => page.id),
      extract: extra,
      ...(exactPage ? { canonicalId: exactId } : {}),
    });
    logger.debug(
      `Memory merge group for "${extra.slug}" with ${formatPageRefs(live)} ` +
        `(catalog=${formatPageRefs(catalogHits)})`
    );
  }

  for (const targets of mergeTargets) {
    const ids = canonicalizeMemoryLabelIds(targets).filter(
      (id) => recalled.has(id) && !harmful.has(id) && !consumedIds.has(id)
    );
    if (ids.length < 2) {
      continue;
    }
    if (targets.some((id) => harmful.has(canonicalizeMemoryLabelId(id) ?? id))) {
      continue;
    }
    for (const id of ids) {
      consumedIds.add(id);
    }
    groups.push({ sourceIds: ids });
  }

  for (const group of groups) {
    const sources = (await Promise.all(group.sourceIds.map(async (id) => store.get(id)))).filter(
      (page): page is MemoryPage => page !== undefined && page.status !== 'archived'
    );
    const memberCount = sources.length + (group.extract ? 1 : 0);
    if (sources.length < 1 || memberCount < 2) {
      logger.debug('Memory merge skipped — fewer than 2 live members after refresh');
      continue;
    }
    if (!synthesizeMemoryGroup) {
      logger.warn('Memory merge skipped — no synthesizer configured');
      continue;
    }
    summary.mergeAttemptCount += 1;
    const mergeResult = await mergeMemoryGroup({
      store,
      sources,
      extract: group.extract,
      canonicalId: group.canonicalId,
      task,
      synthesizeMemoryGroup,
      now,
      logger,
    });
    if (mergeResult.merged) {
      summary.mergeSuccessCount += 1;
    }
    summary.mergedSourceArchiveCount += mergeResult.archivedSourceCount;
    summary.writeFailureCount += mergeResult.writeFailureCount;
  }

  for (let index = 0; index < extractions.length; index++) {
    if (consumedExtracts.has(index)) {
      continue;
    }
    const extra = extractions[index];
    try {
      await store.create({
        slug: extra.slug,
        title: extra.title,
        content: extra.content,
        context: task,
        tags: extra.tags,
        categories: extra.categories,
        references: [],
        status: 'tentative',
        user: 'nightshift-optimizer',
      });
      summary.standaloneUpsertCount += 1;
      logger.debug(
        `Memory extract upserted ${toMemoryKiId(extra.slug)} contextChars=${task.length}`
      );
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 409) {
        const winner = await store.get(toMemoryKiId(extra.slug));
        if (winner?.status === 'archived') {
          logger.debug(`Skipped extraction "${extra.slug}" — race winner is archived`);
          continue;
        }
        if (winner && synthesizeMemoryGroup) {
          summary.mergeAttemptCount += 1;
          const mergeResult = await mergeMemoryGroup({
            store,
            sources: [winner],
            extract: extra,
            canonicalId: winner.id,
            task,
            synthesizeMemoryGroup,
            now,
            logger,
          });
          if (mergeResult.merged) {
            summary.mergeSuccessCount += 1;
          }
          summary.mergedSourceArchiveCount += mergeResult.archivedSourceCount;
          summary.writeFailureCount += mergeResult.writeFailureCount;
          continue;
        }
      }
      summary.writeFailureCount += 1;
      logger.warn('Failed to extract a memory page');
      logger.debug(`Memory extraction write failed slug=${extra.slug}: ${(err as Error).message}`);
    }
  }
  logger.info(
    `Memory edits completed: standalone=${summary.standaloneUpsertCount}, ` +
      `merged=${summary.mergeSuccessCount}, archived=${
        summary.harmfulArchiveCount + summary.mergedSourceArchiveCount
      }, ` +
      `writeFailures=${summary.writeFailureCount}`
  );
  return summary;
};

interface MergeMemoryGroupResult {
  merged: boolean;
  archivedSourceCount: number;
  writeFailureCount: number;
}

const mergeMemoryGroup = async ({
  store,
  sources,
  extract,
  canonicalId: initialCanonicalId,
  task,
  synthesizeMemoryGroup,
  now,
  logger,
}: {
  store: MemoryPageStore;
  sources: MemoryPage[];
  extract?: MemoryExtractProposal;
  canonicalId?: string;
  task: string;
  synthesizeMemoryGroup: SynthesizeMemoryGroup;
  now: () => number;
  logger: Logger;
}): Promise<MergeMemoryGroupResult> => {
  const nowSec = now();
  let canonicalId = initialCanonicalId;
  let writtenCanonicalId: string | undefined;
  const originalSources = [...sources];

  for (let conflictAttempt = 0; conflictAttempt <= 2; conflictAttempt++) {
    let versionedCanonical =
      canonicalId !== undefined ? await store.getVersioned(canonicalId) : undefined;
    if (canonicalId && !versionedCanonical) {
      logger.warn('Memory merge aborted because the canonical page disappeared');
      logger.debug(`Memory merge missing canonical=${canonicalId}`);
      return { merged: false, archivedSourceCount: 0, writeFailureCount: 1 };
    }
    if (versionedCanonical?.page.status === 'archived') {
      logger.debug(`Memory merge skipped — canonical ${canonicalId} is archived`);
      return { merged: false, archivedSourceCount: 0, writeFailureCount: 0 };
    }

    const currentSources = unionPages(
      originalSources,
      versionedCanonical ? [versionedCanonical.page] : []
    );
    let synthesis: MemoryMergeSynthesis;
    try {
      synthesis = await synthesizeMemoryGroup({
        sources: currentSources,
        extract,
        task: extract ? task : undefined,
      });
    } catch (err) {
      logger.warn('Memory merge synthesis failed');
      logger.debug(`Memory merge synthesis error: ${(err as Error).message}`);
      return { merged: false, archivedSourceCount: 0, writeFailureCount: 0 };
    }

    const content = capMergedContent(synthesis.content);
    if (synthesis.title.length === 0 || content.trim().length === 0) {
      logger.warn('Memory merge aborted — synthesis returned an empty title or content');
      return { merged: false, archivedSourceCount: 0, writeFailureCount: 0 };
    }
    if (
      looksLikeSecret(
        [
          synthesis.title,
          content,
          synthesis.context,
          ...(extract ? [extract.tags.join('\n'), extract.categories.join('\n')] : []),
        ].join('\n')
      )
    ) {
      logger.warn('Memory merge aborted — synthesised content looks like a secret');
      return { merged: false, archivedSourceCount: 0, writeFailureCount: 0 };
    }
    const hadRecallKey =
      currentSources.some((page) => (page.context ?? '').trim().length > 0) ||
      (extract !== undefined && task.length > 0);
    if (synthesis.context.length === 0 && hadRecallKey) {
      logger.warn('Memory merge aborted — synthesis returned an empty recall context');
      return { merged: false, archivedSourceCount: 0, writeFailureCount: 0 };
    }

    let slug = versionedCanonical?.page.slug;
    if (!slug) {
      const avoid = new Set(currentSources.map((page) => page.id));
      const base = canonicalizeSlug(synthesis.title) || 'merged';
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidate =
          attempt === 0 ? base : attempt === 1 ? `${base}-merged` : `${base}-merged-${attempt}`;
        const candidateId = toMemoryKiId(candidate);
        if (avoid.has(candidateId) || (await store.get(candidateId))) {
          continue;
        }
        slug = candidate;
        canonicalId = candidateId;
        break;
      }
      if (!slug || !canonicalId) {
        logger.warn('Memory merge aborted — no free canonical slug found');
        return { merged: false, archivedSourceCount: 0, writeFailureCount: 0 };
      }
    }

    const mergedFrom = unionStrings(
      currentSources.flatMap((page) => [page.id, ...(page.merged_from ?? [])]),
      extract ? [toMemoryKiId(extract.slug)] : []
    );
    let impressions = 0;
    let conversions = 0;
    for (const page of currentSources) {
      const display = toMemoryDisplayTelemetry(page, nowSec);
      impressions += display.impressions;
      conversions += display.conversions;
    }
    const write = {
      slug,
      title: synthesis.title,
      content,
      context: synthesis.context,
      tags: unionStrings(
        currentSources.flatMap((page) => page.tags),
        extract?.tags
      ).filter((tag) => tag !== 'memory'),
      categories: unionStrings(
        currentSources.flatMap((page) => page.categories),
        extract?.categories
      ),
      references: unionStrings(currentSources.flatMap((page) => page.references)),
      status: currentSources.some((page) => page.status === 'established')
        ? ('established' as const)
        : ('tentative' as const),
      source: `Merged from memories: ${mergedFrom.join(', ')}`,
      merged_from: mergedFrom,
      telemetry: {
        impressions,
        conversions,
        last_impression_time: epochSecondsToIso(nowSec),
      },
      user: 'nightshift-optimizer',
    };
    const targetCanonicalId = canonicalId;
    if (!targetCanonicalId) {
      return { merged: false, archivedSourceCount: 0, writeFailureCount: 1 };
    }

    try {
      if (versionedCanonical) {
        await store.update(targetCanonicalId, write, versionedCanonical);
      } else {
        await store.create(write);
      }
      writtenCanonicalId = targetCanonicalId;
      sources = currentSources;
      break;
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode !== 409) {
        logger.warn('Memory merge failed to write its canonical page');
        logger.debug(`Memory merge canonical write error: ${(err as Error).message}`);
        return { merged: false, archivedSourceCount: 0, writeFailureCount: 1 };
      }
      versionedCanonical = await store.getVersioned(targetCanonicalId);
      if (versionedCanonical?.page.status === 'archived') {
        logger.debug(`Memory merge skipped — conflict winner ${targetCanonicalId} is archived`);
        return { merged: false, archivedSourceCount: 0, writeFailureCount: 0 };
      }
      if (conflictAttempt === 2) {
        logger.warn('Memory merge exhausted version conflicts; sources preserved');
        logger.debug(`Memory merge conflict exhaustion canonical=${targetCanonicalId}`);
        return { merged: false, archivedSourceCount: 0, writeFailureCount: 1 };
      }
    }
  }

  if (!writtenCanonicalId) {
    return { merged: false, archivedSourceCount: 0, writeFailureCount: 1 };
  }

  let archivedSourceCount = 0;
  let writeFailureCount = 0;
  for (const page of sources) {
    if (page.id === writtenCanonicalId) {
      continue;
    }
    try {
      await store.archive(page.id, 'merged');
      archivedSourceCount += 1;
    } catch (err) {
      writeFailureCount += 1;
      logger.warn('Memory merge wrote canonical but failed to archive a source');
      logger.debug(`Memory merge archive failed source=${page.id}: ${String(err)}`);
    }
  }
  logger.debug(
    `Merged ${sources.map((page) => page.id).join(', ')} into ${writtenCanonicalId}` +
      (extract ? ` (folded extract ${extract.slug})` : '')
  );
  return { merged: true, archivedSourceCount, writeFailureCount };
};

export const optimizeMemory = async ({
  store,
  recalledIds,
  proposeLabels,
  proposeExtractions,
  synthesizeMemoryGroup,
  userMessage,
  assistantMessage,
  logger,
}: {
  store: MemoryPageStore;
  recalledIds: string[];
  proposeLabels: ProposeMemoryLabels;
  proposeExtractions: ProposeMemoryExtractions;
  synthesizeMemoryGroup?: SynthesizeMemoryGroup;
  userMessage: string;
  assistantMessage: string;
  logger: Logger;
}): Promise<MemoryOptimizeSummary> => {
  logger.debug(
    `Memory optimize start recalledIds=${recalledIds.length} ` +
      `[${recalledIds.join(', ') || '(none)'}] userChars=${userMessage.length} ` +
      `assistantChars=${assistantMessage.length} user=${JSON.stringify(previewText(userMessage))}`
  );
  if (recalledIds.length === 0 && assistantMessage.trim().length === 0) {
    logger.info('Memory optimizer skipped — no recalled memories and empty assistant message');
    return { ...emptyMemoryEditSummary(), recalledCount: 0, loadedCount: 0 };
  }

  const recalledMemories = (await Promise.all(recalledIds.map((id) => store.get(id)))).filter(
    (page): page is MemoryPage => page !== undefined
  );
  const loadedIds = new Set(recalledMemories.map((page) => page.id));
  const missingIds = recalledIds.filter((id) => !loadedIds.has(id));
  logger.debug(
    `Memory optimize loaded ${recalledMemories.length}/${recalledIds.length} recalled page(s): ` +
      `${formatPageRefs(recalledMemories)} missing=[${missingIds.join(', ') || '(none)'}]`
  );

  const task = unwrapUserTask(userMessage);
  const transcript = [
    '## User',
    task.slice(0, MAX_TRANSCRIPT_CHARS),
    '',
    '## Assistant',
    assistantMessage.slice(0, MAX_TRANSCRIPT_CHARS),
  ].join('\n');

  let labels: MemoryLabelProposal;
  if (recalledMemories.length === 0) {
    logger.debug('Memory critique skipped — no recalled pages loaded');
    labels = { useful: [], harmful: [] };
  } else {
    const critiqueStarted = Date.now();
    logger.debug(
      `Memory critique LLM start nightshift_memory_critique recalled=${recalledMemories.length} ` +
        `transcriptChars=${transcript.length}`
    );
    labels = await proposeLabels({ transcript, recalledMemories });
    logger.debug(
      `Memory critique LLM done ${Date.now() - critiqueStarted}ms ` +
        `useful=[${labels.useful.join(', ') || '(none)'}] ` +
        `harmful=[${labels.harmful.join(', ') || '(none)'}]`
    );
  }

  // Cold-start rounds have an empty recalled set; still extract or the store never fills.
  const shouldExtract = assistantMessage.trim().length > 0;
  let extractions: MemoryExtractProposal[] = [];
  let mergeTargets: string[][] = [];
  if (!shouldExtract) {
    logger.debug('Memory extract skipped — empty assistant message');
  } else {
    const extractStarted = Date.now();
    logger.debug(
      `Memory extract LLM start nightshift_memory_extract recalled=${recalledMemories.length} ` +
        `transcriptChars=${transcript.length}`
    );
    const extracted = await proposeExtractions({ transcript, recalledMemories });
    extractions = extracted.extractions;
    mergeTargets = extracted.mergeTargets;
    logger.debug(
      `Memory extract LLM done ${Date.now() - extractStarted}ms ` +
        `proposals=${extractions.length} ` +
        (extractions.length === 0
          ? '(none)'
          : extractions
              .map((extra) => `${extra.slug} "${previewText(extra.title, 60)}"`)
              .join(', '))
    );
  }

  if (
    labels.useful.length === 0 &&
    labels.harmful.length === 0 &&
    extractions.length === 0 &&
    recalledIds.length === 0
  ) {
    logger.info('Memory optimizer proposed no edits');
    return {
      ...emptyMemoryEditSummary(),
      recalledCount: recalledIds.length,
      loadedCount: recalledMemories.length,
    };
  }

  const editSummary = await applyMemoryEdits({
    store,
    recalledIds,
    recalledMemories,
    labels,
    extractions,
    mergeTargets,
    context: task,
    synthesizeMemoryGroup,
    logger,
  });
  return {
    ...editSummary,
    recalledCount: recalledIds.length,
    loadedCount: recalledMemories.length,
  };
};
