/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  estimateTokens,
  truncateTokens,
} from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { isElasticsearchWriteConflict } from '@kbn/occ';
import { formatPageRefs, previewText } from './log_format';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { hasToolEvidence, renderMemoryTranscript, type TranscriptStep } from './transcript';
import type { MemoryPageStore, MemoryPageWrite, VersionedMemoryPage } from './page_store';
import {
  canonicalizeSlug,
  epochSecondsToIso,
  toMemoryDisplayTelemetry,
  toMemoryKiId,
} from './page_store';
import { toCounterUpdates } from './ranking';
import { type MemoryPage } from '../../common/memory';
import { canonicalizeTags, MAX_MEMORY_TAGS_PER_PAGE } from '../../common/memory_tags';

const MAX_EXTRACTIONS = 3;

export const MEMORY_CRITIQUE_SYSTEM_PROMPT = `You are an impartial analyst-LLM.

**Objective**
Evaluate how retrieved *memory* affected an agent's work.

The transcript has the user task; the investigation, in order (the agent's notes and every tool call with an excerpt of its result); and the final answer. Use it to see whether the agent opened, followed, or contradicted a recalled memory: reading a memory's file shows it was opened, and what the agent did next shows whether it was followed. If results are unavailable, tool calls show parameters only.

**Definitions**
- *Positive signal* ("helpful"): the agent used the memory's content: quoted it, aligned with it, or it enabled correct decisions. Opening the file is not use.
- *Negative signal* ("harmful"): the memory's content was wrong, outdated, or misleading, and caused contradiction, wasted steps, or misinformation. A memory that the investigation or the final answer corrects or contradicts is harmful, even if it pointed the agent to the right area.
- Neutral / unused: omit. This includes a memory that does not apply to this task, even if the agent opened it. Not applying is not harm.

Be conservative with labeling useful memories: only identify as useful if definitely helpful.

Return only recalled memory ids (the id= value, e.g. memory_checkout-redis-evictions). Never titles, content, or the full recalled line.`;

export const MEMORY_EXTRACT_SYSTEM_PROMPT = `You are a knowledge distillation engine for an AI SRE assistant. After each conversation you propose **up to 3** memory entries. Each entry is one topic: durable facts about this customer's systems that are not public knowledge or in your training data, and that the same assistant would want to know ahead of time on a *similar but not exactly the same* future task in this environment. An entry is either new, or replaces recalled memories that this conversation corrects, extends, or shows to be duplicates.

Focus strictly on durable, tool-output-verifiable knowledge about the customer's environment — how this organization's systems are structured and how its components behave. Do **not** extract what the run read from pre-existing knowledge files that the agent didn't generate (memories, Cortex pages, decision trees, and environment docs under /workspace/).`;

export const MEMORY_EXTRACT_GUIDELINES = `Review the conversation. Extract only facts that a tool result in the investigation shows.

**EXTRACT** — durable customer-environment knowledge the assistant would want before starting a similar task:
- Organizational context: team ownership, on-call structure, service → team mapping, escalation paths, naming conventions.
- System component behavior: what a service/job does, its upstream/downstream dependencies, typical traffic/latency/error profile, known failure modes.
- Environment topology: how services are named in traces/logs/metrics, how environments (prod/stage/etc.) are labeled, which hosts/clusters/regions serve what role.

**NEVER EXTRACT:**
- Knowledge already present in the memories recalled for this session — repeating it just bloats the store. To correct, extend, or combine recalled memories, replace them instead.
- Common-sense or generic knowledge that isn't specific to this customer's environment (e.g. "Prometheus exposes /api/v1/query", "K8s pods restart on OOM").
- "How we investigated this" narratives — capture the *facts* the investigation uncovered, not the procedure.
- Negation / absence ("X doesn't exist", "no doc found").
- Credentials, tokens, or secrets.
- Container internals (/proc, hex ports, Docker layers).
- Information only relevant to this specific request (e.g. the single alert fingerprint being investigated).

**NEW OR REPLACE** — you choose the topics; you do not write the memories. Every entry has a title (its topic), keywords, and replaces. A writer then writes each entry's content from the transcript and the memories it replaces, and every memory in replaces is archived once it is written.
- New topic: replaces is empty.
- This run corrects or extends a recalled memory: replaces lists its id. Read the recalled memory sentence by sentence: it is outdated if it states as ongoing a problem this run shows has stopped ("the clock runs 1 s behind", "errors occur"), or states as current a value this run measured differently, even if it was true when written.
- Several recalled memories cover the same topic or the same data: replaces lists all of them, so they become one memory instead of sitting side by side.
- Propose an entry only when this run's evidence adds to, corrects, or combines the topic. A recalled memory that is still right and complete needs no entry.
- The title names the topic. When the entry replaces one memory and the topic is unchanged, copy that memory's title exactly, word for word; change it only when this run shows the topic itself was named wrongly.
- keywords are a few short terms for the topic: the services, components, signals, or data streams it is about.

Return an empty list if the conversation produced no reusable environment knowledge.`;

export interface MemoryLabelProposal {
  useful: string[];
  harmful: string[];
}

export interface MemoryExtractProposal {
  slug: string;
  title: string;
  /** Keywords for the topic, stored as tags. */
  tags: string[];
  /** Recalled memory ids this entry supersedes; they are archived once it is written. */
  replaces: string[];
}

export type ProposeMemoryLabels = (input: {
  transcript: string;
  recalledMemories: MemoryPage[];
}) => Promise<MemoryLabelProposal>;

export interface MemoryExtractionBatch {
  extractions: MemoryExtractProposal[];
}

export interface MemoryMergeSynthesis {
  content: string;
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
  extract: MemoryExtractProposal;
  transcript?: string;
  /** Titles of the other entries proposed this round. */
  otherTopics?: string[];
}) => Promise<MemoryMergeSynthesis>;

/** Normalize the user-authored task without interpreting literal prompt content. */
export const unwrapUserTask = (prompt: string | undefined): string => {
  return prompt?.trim() ?? '';
};

export const MERGED_CONTENT_MAX_CHARS = 4000;

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

export const OPTIMIZER_MIN_CONTEXT_WINDOW_TOKENS = 256_000;
export const OPTIMIZER_EVIDENCE_TOKEN_BUDGET = 128_000;
export const OPTIMIZER_OUTPUT_TOKEN_LIMIT = 8_000;
export const OPTIMIZER_EVIDENCE_CHARACTER_HARD_LIMIT = 2_000_000;
export const MAX_RECALLED_TITLE_CHARS = 256;

interface EvidenceEntry {
  prefix: string;
  content: string;
}

const formatEvidenceEntries = (entries: readonly EvidenceEntry[], maxTokens: number): string => {
  if (entries.length === 0 || maxTokens <= 0) {
    return '';
  }

  let output = '';
  let remainingTokens = maxTokens;
  for (const entry of entries) {
    const prefixTokens = estimateTokens(entry.prefix);
    if (prefixTokens > remainingTokens) {
      break;
    }
    output += entry.prefix;
    remainingTokens -= prefixTokens;

    const contentTokens = estimateTokens(entry.content);
    if (contentTokens <= remainingTokens) {
      output += entry.content;
      remainingTokens -= contentTokens;
      continue;
    }
    output += truncateTokens(entry.content, remainingTokens);
    break;
  }

  return output.slice(0, OPTIMIZER_EVIDENCE_CHARACTER_HARD_LIMIT);
};

export const formatRecalled = (
  recalledMemories: readonly MemoryPage[],
  maxTokens = OPTIMIZER_EVIDENCE_TOKEN_BUDGET
): string => {
  if (recalledMemories.length === 0) {
    return '(none)';
  }

  return formatEvidenceEntries(
    recalledMemories.map((memory, index) => ({
      prefix:
        `${index === 0 ? '' : '\n'}- id=${memory.id}\n` +
        `  title: ${memory.title.slice(0, MAX_RECALLED_TITLE_CHARS)}\n` +
        `  updated: ${memory.updated_at}\n` +
        `  content: `,
      content: memory.content,
    })),
    maxTokens
  );
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
  signal,
}: {
  inferenceClient: BoundInferenceClient;
  signal?: AbortSignal;
}): ProposeMemoryLabels => {
  return async ({ transcript, recalledMemories }) => {
    const response = await inferenceClient.output({
      id: 'nightshift_memory_critique',
      abortSignal: signal,
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

const looksLikeSecret = (value: string): boolean =>
  /(?:api[_-]?key|secret|password)\s*[:=]\s*\S+/i.test(value) ||
  /bearer\s+[a-z0-9._-]{12,}/i.test(value);

export const createLlmProposeMemoryExtractions = ({
  inferenceClient,
  signal,
}: {
  inferenceClient: BoundInferenceClient;
  signal?: AbortSignal;
}): ProposeMemoryExtractions => {
  return async ({ transcript, recalledMemories }) => {
    const response = await inferenceClient.output({
      id: 'nightshift_memory_extract',
      abortSignal: signal,
      system: MEMORY_EXTRACT_SYSTEM_PROMPT,
      input: `${MEMORY_EXTRACT_GUIDELINES}

Run time: ${new Date().toISOString()}

Recalled memories (replace one only to correct, extend, or combine it):\n${formatRecalled(
        recalledMemories
      )}

Investigation transcript:\n${transcript}`,
      schema: {
        type: 'object',
        properties: {
          extractions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description:
                    'Short, specific name for the fact. It becomes the memory file name ' +
                    '(lower-cased, hyphenated), e.g. "Checkout Redis evictions".',
                },
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'A few short terms for the topic.',
                },
                replaces: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Recalled memory ids (the id= value) this entry supersedes.',
                },
              },
              required: ['title', 'keywords', 'replaces'],
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
      extractions: extractions
        .map((entry) => {
          const candidate =
            typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : {};
          const title = String(candidate.title ?? '').trim();
          // Validate before canonicalization: replacing `api_key=` punctuation with hyphens would
          // otherwise hide the secret pattern while retaining it in the durable ID/path.
          if (looksLikeSecret(title)) {
            return undefined;
          }
          return {
            slug: canonicalizeSlug(title),
            title,
            // Canonicalized here rather than at read time: a tag the model spells
            // `Invoke Agent` and one spelled `invoke_agent` are the same tag, and a
            // graph that ranked them separately would split the evidence.
            tags: Array.isArray(candidate.keywords)
              ? canonicalizeTags(candidate.keywords).slice(0, MAX_MEMORY_TAGS_PER_PAGE)
              : [],
            replaces: Array.isArray(candidate.replaces)
              ? canonicalizeMemoryLabelIds(candidate.replaces.map(String))
              : [],
          };
        })
        .filter(
          (entry): entry is MemoryExtractProposal =>
            entry !== undefined && entry.slug.length > 0 && entry.title.length > 0
        )
        .slice(0, MAX_EXTRACTIONS),
    };
  };
};

export const MEMORY_WRITER_SYSTEM_PROMPT = `You maintain the semantic memory of an AI SRE assistant that works in one customer's environment. Write the memory for one topic.

A memory is recalled on future, similar tasks, so its value is its signal to noise: keep only durable facts about this customer's systems that are not public knowledge or in your training data and that the assistant would want to know before starting such a task. Leave out what only describes this run.

Base the memory on what this run's tool results showed. Do not copy or cite what the run read from stored knowledge pre-existing on the file system that the agent didn't create through tool calling, except the memories this entry replaces.

Worth keeping:
- Organizational context: team ownership, on-call structure, service → team mapping, escalation paths, naming conventions.
- System component behavior: what a service or job does, its upstream and downstream dependencies, its typical traffic, latency, and error profile, its known failure modes.
- Environment topology: how services are named in traces, logs, and metrics, how environments are labeled, which hosts, clusters, or regions serve what role.

Never write:
- Generic knowledge that applies to any customer.
- How the investigation was done.
- Advice or recommendations.
- Credentials, tokens, secrets, or container internals.
- Facts that belong to the other entries written this round, or mentions of other memories.

Say when a fact that can change was observed, and describe a problem that has stopped in the past tense.

Return concise markdown of at most ${MERGED_CONTENT_MAX_CHARS.toLocaleString(
  'en-US'
)} characters, or empty content if nothing durable about the topic is established.`;

export const MEMORY_COMPACT_SYSTEM_PROMPT = `You shorten one memory written for the semantic memory of an AI SRE assistant. The memory is over its length budget.

You get the writer's instructions, the input the writer saw, and the memory it wrote. Rewrite the memory in fewer words so it is no longer than the target length you are given: keep the facts that are most useful to know before a similar future task, merge repetition, and drop the least useful details. Follow the writer's instructions and add nothing that is not already in the memory.

Return the shortened markdown.`;

export const formatMemoryMergeSources = ({
  sources,
  extract,
  maxTokens = OPTIMIZER_EVIDENCE_TOKEN_BUDGET,
}: {
  sources: readonly MemoryPage[];
  extract?: MemoryExtractProposal;
  maxTokens?: number;
}): string =>
  formatEvidenceEntries(
    [
      ...(extract
        ? [
            {
              prefix: `Topic: ${extract.title.slice(0, MAX_RECALLED_TITLE_CHARS)}\n` + `Keywords: `,
              content:
                `${extract.tags.join(', ') || '(none)'}\n\n` +
                (sources.length > 0
                  ? 'Memories this entry replaces. Integrate their facts that still hold with what this run learned:'
                  : 'Memories this entry replaces: (none)'),
            },
          ]
        : []),
      ...sources.map((page, index) => ({
        prefix:
          `${index === 0 && !extract ? '' : '\n'}` +
          `- id=${page.id}\n` +
          `  updated: ${page.updated_at}\n` +
          `  content: `,
        content: page.content,
      })),
    ],
    maxTokens
  );

// Models miss character targets and overshoot word targets, so compaction aims well below the budget.
const COMPACT_TARGET_RATIO = 0.6;

const CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string' },
  },
  required: ['content'],
} as const;

export const createLlmSynthesizeMemoryGroup = ({
  inferenceClient,
  signal,
  logger,
}: {
  inferenceClient: BoundInferenceClient;
  signal?: AbortSignal;
  logger?: Logger;
}): SynthesizeMemoryGroup => {
  return async ({ sources, extract, transcript, otherTopics = [] }) => {
    const transcriptBlock = transcript
      ? `\n\nInvestigation transcript:\n${transcript}`
      : '\n\nInvestigation transcript: (unavailable)';
    const othersBlock = `\n\nOther entries written this round: ${
      otherTopics.length > 0
        ? otherTopics.map((topic) => `\n- ${topic.slice(0, MAX_RECALLED_TITLE_CHARS)}`).join('')
        : '(none)'
    }`;
    const framingTokens = estimateTokens(transcriptBlock) + estimateTokens(othersBlock);
    const entryBlock = formatMemoryMergeSources({
      sources,
      extract,
      maxTokens: Math.max(0, OPTIMIZER_EVIDENCE_TOKEN_BUDGET - framingTokens),
    });
    const writerInput = `Run time: ${new Date().toISOString()}\n\n${entryBlock}${othersBlock}${transcriptBlock}`;
    const response = await inferenceClient.output({
      id: 'nightshift_memory_write',
      abortSignal: signal,
      system: MEMORY_WRITER_SYSTEM_PROMPT,
      input: writerInput,
      schema: CONTENT_SCHEMA,
    });
    const content = String(response.output?.content ?? '').trim();
    if (content.length <= MERGED_CONTENT_MAX_CHARS) {
      return { content };
    }
    signal?.throwIfAborted();
    const overage = content.length - MERGED_CONTENT_MAX_CHARS;
    const words = content.split(/\s+/).length;
    const targetWords = Math.floor(
      (MERGED_CONTENT_MAX_CHARS * COMPACT_TARGET_RATIO * words) / content.length
    );
    let compacted;
    try {
      compacted = await inferenceClient.output({
        id: 'nightshift_memory_compact',
        abortSignal: signal,
        system: MEMORY_COMPACT_SYSTEM_PROMPT,
        input:
          `Budget: ${MERGED_CONTENT_MAX_CHARS} characters. The memory has ${content.length}, ${overage} over. ` +
          `Target: at most ${targetWords} words; the memory has ${words} words now.\n\n` +
          `Writer instructions:\n${MEMORY_WRITER_SYSTEM_PROMPT}\n\n` +
          `Writer input:\n${writerInput}\n\n` +
          `Memory to shorten:\n${content}`,
        schema: CONTENT_SCHEMA,
      });
    } catch (err) {
      signal?.throwIfAborted();
      logger?.warn('Memory compaction failed — storing the truncated memory');
      logger?.debug(`Memory compaction error: ${(err as Error).message}`);
      return { content };
    }
    const shortened = String(compacted.output?.content ?? '').trim();
    return { content: shortened.length > 0 ? shortened : content };
  };
};

const extractionSafetyText = (extra: MemoryExtractProposal, task: string): string =>
  [extra.title, extra.tags.join('\n'), task].join('\n');

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

/**
 * Writes a fresh memory over an archived one that holds the same id. The archived version's
 * counters are not inherited; its merge history is.
 */
const writeOverArchived = async (
  store: MemoryPageStore,
  archived: VersionedMemoryPage,
  write: MemoryPageWrite,
  nowSec: number
): Promise<void> => {
  const mergedFrom = unionStrings(write.merged_from, archived.page.merged_from);
  await store.update(
    archived.page.id,
    {
      ...write,
      ...(mergedFrom.length > 0 ? { merged_from: mergedFrom } : {}),
      telemetry: write.telemetry ?? {
        impressions: 0,
        conversions: 0,
        last_impression_time: epochSecondsToIso(nowSec),
      },
    },
    archived
  );
};

export const applyMemoryEdits = async ({
  store,
  recalledIds,
  recalledMemories = [],
  labels,
  extractions,
  context,
  transcript,
  agentId,
  conversationId,
  synthesizeMemoryGroup,
  now = () => Date.now() / 1000,
  logger,
}: {
  store: MemoryPageStore;
  recalledIds: string[];
  recalledMemories?: MemoryPage[];
  labels: MemoryLabelProposal;
  extractions: MemoryExtractProposal[];
  /** Current user task — stored on new pages as the recall key. */
  context?: string;
  transcript?: string;
  /** Provenance stamped on new pages. Metadata only. */
  agentId?: string;
  conversationId?: string;
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
  // A harmful memory never reaches the writer, even when an entry replaces or overlaps it; that
  // entry is written without it.
  for (const id of archiveIds) {
    await store.archive(id, 'harmful');
    summary.harmfulArchiveCount += 1;
    logger.debug(`Memory archived ${id} reason=harmful`);
  }
  await store.applyCounterUpdates(updates);

  const task = unwrapUserTask(context);
  const consumedIds = new Set<string>();
  const otherTopicsOf = (extract: MemoryExtractProposal): string[] =>
    extractions.filter((other) => other !== extract).map((other) => other.title);

  interface MemoryEntryGroup {
    sourceIds: string[];
    extract: MemoryExtractProposal;
    canonicalId?: string;
  }
  const groups: MemoryEntryGroup[] = [];

  for (const extra of extractions) {
    logger.debug(
      `Memory extraction candidate slug=${extra.slug} title=${JSON.stringify(
        previewText(extra.title, 80)
      )} tags=${extra.tags.join(',') || '(none)'} replaces=[${extra.replaces.join(', ')}]`
    );
    if (looksLikeSecret(extractionSafetyText(extra, task))) {
      logger.warn('Skipped a memory extraction because proposed content looks secret');
      logger.debug(`Memory extraction safety skip slug=${extra.slug}`);
      summary.safetySkipCount += 1;
      continue;
    }

    const named = recalledMemories.filter(
      (page) => extra.replaces.includes(page.id) && !page.archived && !harmful.has(page.id)
    );
    const harmfulReplaces = extra.replaces.filter((id) => harmful.has(id));
    if (harmfulReplaces.length > 0) {
      logger.debug(
        `Extraction "${extra.slug}" replaces harmful memories, archived without merging: ` +
          `[${harmfulReplaces.join(', ')}]`
      );
    }
    const unknownReplaces = extra.replaces.filter(
      (id) => !harmful.has(id) && !named.some((page) => page.id === id)
    );
    if (unknownReplaces.length > 0) {
      logger.debug(
        `Extraction "${extra.slug}" names ${unknownReplaces.length} replace id(s) that are not ` +
          `live recalled memories: [${unknownReplaces.join(', ')}]`
      );
    }
    // The extractor only sees recalled memories, so a live memory already at this entry's id
    // joins the entry even when it is not named.
    const exactId = toMemoryKiId(extra.slug);
    const exactStored = await store.get(exactId);
    const exactPage = exactStored && !exactStored.archived ? exactStored : undefined;
    const sources = exactPage ? [...named.filter((page) => page.id !== exactId), exactPage] : named;
    if (sources.some((page) => consumedIds.has(page.id))) {
      logger.debug(`Skipped extraction "${extra.slug}" — a source already belongs to an entry`);
      continue;
    }
    for (const page of sources) {
      consumedIds.add(page.id);
    }
    groups.push({
      sourceIds: sources.map((page) => page.id),
      extract: extra,
      ...(exactPage ? { canonicalId: exactId } : {}),
    });
    logger.debug(
      `Memory entry "${extra.slug}" replaces named=${formatPageRefs(named)} ` +
        `exact=${exactPage ? exactId : '(none)'}`
    );
  }

  for (const group of groups) {
    if (!synthesizeMemoryGroup) {
      logger.warn('Memory write skipped — no writer configured');
      continue;
    }
    const replacing = group.sourceIds.length > 0;
    if (replacing) {
      summary.mergeAttemptCount += 1;
    }
    const result = await mergeMemoryGroup({
      store,
      sourceIds: group.sourceIds,
      extract: group.extract,
      canonicalId: group.canonicalId,
      task,
      transcript,
      otherTopics: otherTopicsOf(group.extract),
      agentId,
      conversationId,
      synthesizeMemoryGroup,
      now,
      logger,
    });
    if (result.writtenId && result.sourceCount === 0) {
      summary.standaloneUpsertCount += 1;
    } else if (result.writtenId) {
      // A new entry whose create lost a race was merged into the page that won it.
      summary.mergeAttemptCount += replacing ? 0 : 1;
      summary.mergeSuccessCount += 1;
    }
    summary.mergedSourceArchiveCount += result.archivedSourceCount;
    summary.writeFailureCount += result.writeFailureCount;
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
  /** The page the entry was written to; unset when nothing was written. */
  writtenId?: string;
  /** Stored memories the written entry incorporates, the canonical page included. */
  sourceCount: number;
  archivedSourceCount: number;
  writeFailureCount: number;
}

const mergeMemoryGroup = async ({
  store,
  sourceIds: initialSourceIds,
  extract,
  canonicalId: initialCanonicalId,
  task,
  transcript,
  otherTopics,
  agentId,
  conversationId,
  synthesizeMemoryGroup,
  now,
  logger,
}: {
  store: MemoryPageStore;
  sourceIds: string[];
  extract: MemoryExtractProposal;
  canonicalId?: string;
  task: string;
  transcript?: string;
  otherTopics: string[];
  /** Provenance stamped on the written page. Metadata only. */
  agentId?: string;
  conversationId?: string;
  synthesizeMemoryGroup: SynthesizeMemoryGroup;
  now: () => number;
  logger: Logger;
}): Promise<MergeMemoryGroupResult> => {
  const nowSec = now();
  let canonicalId = initialCanonicalId;
  let canonicalIsSource = initialCanonicalId !== undefined;
  let writtenCanonicalId: string | undefined;
  let committedSources: VersionedMemoryPage[] = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    const requiredSourceIds = unionStrings(
      initialSourceIds,
      canonicalIsSource && canonicalId ? [canonicalId] : undefined
    );
    const sourceSnapshots = await Promise.all(
      requiredSourceIds.map(async (id) => store.getVersioned(id))
    );
    const unavailableIndex = sourceSnapshots.findIndex((source) => !source || source.page.archived);
    if (unavailableIndex !== -1) {
      logger.debug(
        `Memory merge aborted — required source ${requiredSourceIds[unavailableIndex]} is missing or archived`
      );
      return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 0 };
    }
    const versionedSources = sourceSnapshots as VersionedMemoryPage[];
    const currentSources = versionedSources.map(({ page }) => page);
    const versionedCanonical =
      canonicalIsSource && canonicalId
        ? versionedSources[requiredSourceIds.indexOf(canonicalId)]
        : undefined;

    // Synthesis is asynchronous and may overlap another optimizer round. The versioned
    // snapshots above are therefore validated again immediately before any canonical write.
    let synthesis: MemoryMergeSynthesis;
    try {
      synthesis = await synthesizeMemoryGroup({
        sources: currentSources,
        extract,
        transcript,
        otherTopics,
      });
    } catch (err) {
      logger.warn('Memory merge synthesis failed');
      logger.debug(`Memory merge synthesis error: ${(err as Error).message}`);
      return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 1 };
    }

    const content = capMergedContent(synthesis.content);
    // A page's title and slug are set once, together; writing into an existing canonical page
    // keeps both, and only a newly minted canonical page takes the entry's topic.
    const title = versionedCanonical?.page.title ?? extract.title;
    if (title.length === 0 || content.trim().length === 0) {
      logger.info(`Memory write skipped for "${extract.slug}" — the writer returned no content`);
      return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 0 };
    }
    if (looksLikeSecret([title, content, extract.tags.join('\n')].join('\n'))) {
      logger.warn('Memory merge aborted — synthesised content looks like a secret');
      return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 0 };
    }

    let slug = versionedCanonical?.page.slug;
    let archivedTarget: VersionedMemoryPage | undefined;
    if (!slug) {
      const avoid = new Set(currentSources.map((page) => page.id));
      const base = canonicalizeSlug(title) || 'merged';
      for (let slugAttempt = 0; slugAttempt < 6; slugAttempt++) {
        const suffix =
          slugAttempt === 0 ? '' : slugAttempt === 1 ? '-merged' : `-merged-${slugAttempt}`;
        const candidate = `${base.slice(0, 80 - suffix.length)}${suffix}`;
        const candidateId = toMemoryKiId(candidate);
        if (avoid.has(candidateId)) {
          continue;
        }
        const occupant = await store.get(candidateId);
        if (occupant && !occupant.archived) {
          continue;
        }
        archivedTarget = occupant ? await store.getVersioned(candidateId) : undefined;
        if (occupant && !archivedTarget?.page.archived) {
          continue;
        }
        slug = candidate;
        canonicalId = candidateId;
        break;
      }
      if (!slug || !canonicalId) {
        logger.warn('Memory merge aborted — no free canonical slug found');
        return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 0 };
      }
    }

    let impressions = 0;
    let conversions = 0;
    for (const page of currentSources) {
      const display = toMemoryDisplayTelemetry(page, nowSec);
      impressions += display.impressions;
      conversions += display.conversions;
    }
    const mergedFrom =
      currentSources.length > 0
        ? unionStrings(
            currentSources.flatMap((page) => [page.id, ...(page.merged_from ?? [])]),
            [toMemoryKiId(extract.slug)]
          )
        : [];
    const write: MemoryPageWrite = {
      slug,
      title,
      content,
      // Recall matches the next round's task against this key, so it is this round's task.
      context: task || (versionedCanonical?.page.context ?? ''),
      // Merges union every source page's tags, so the list grows with each merge
      // and the same tag arrives spelled differently each time. Canonicalizing
      // after the union is what collapses those into one tag again.
      tags: canonicalizeTags([...currentSources.flatMap((page) => page.tags), ...extract.tags])
        .filter((tag) => tag !== 'memory')
        .slice(0, MAX_MEMORY_TAGS_PER_PAGE),
      categories: unionStrings(currentSources.flatMap((page) => page.categories)),
      references: unionStrings(currentSources.flatMap((page) => page.references)),
      agent_id: agentId,
      conversation_id: conversationId,
      user: 'nightshift-optimizer',
      ...(currentSources.length > 0
        ? {
            source: `Merged from memories: ${mergedFrom.join(', ')}`,
            merged_from: mergedFrom,
            telemetry: {
              impressions,
              conversions,
              last_impression_time: epochSecondsToIso(nowSec),
            },
          }
        : {}),
    };
    const targetCanonicalId = canonicalId;
    if (!targetCanonicalId) {
      return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 1 };
    }

    const validatedSources = await Promise.all(
      requiredSourceIds.map(async (id) => store.getVersioned(id))
    );
    const unavailableAfterSynthesisIndex = validatedSources.findIndex(
      (source) => !source || source.page.archived
    );
    if (unavailableAfterSynthesisIndex !== -1) {
      logger.debug(
        `Memory merge aborted after synthesis — required source ${requiredSourceIds[unavailableAfterSynthesisIndex]} is missing or archived`
      );
      return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 0 };
    }
    const revalidatedSources = validatedSources as VersionedMemoryPage[];
    const sourceChanged = versionedSources.some((source, index) => {
      const validated = revalidatedSources[index];
      return validated.seqNo !== source.seqNo || validated.primaryTerm !== source.primaryTerm;
    });
    if (sourceChanged) {
      if (attempt === 2) {
        logger.warn('Memory merge exhausted source changes; sources preserved');
        return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 1 };
      }
      continue;
    }

    try {
      if (versionedCanonical) {
        await store.update(targetCanonicalId, write, versionedCanonical);
      } else if (archivedTarget) {
        await writeOverArchived(store, archivedTarget, write, nowSec);
      } else {
        await store.create(write);
      }
      writtenCanonicalId = targetCanonicalId;
      committedSources = revalidatedSources;
      break;
    } catch (err) {
      if (!isElasticsearchWriteConflict(err)) {
        logger.warn('Memory merge failed to write its canonical page');
        logger.debug(`Memory merge canonical write error: ${(err as Error).message}`);
        return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 1 };
      }
      if (attempt === 2) {
        logger.warn('Memory merge exhausted version conflicts; sources preserved');
        logger.debug(`Memory merge conflict exhaustion canonical=${targetCanonicalId}`);
        return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 1 };
      }
      canonicalIsSource = true;
    }
  }

  if (!writtenCanonicalId) {
    return { sourceCount: 0, archivedSourceCount: 0, writeFailureCount: 1 };
  }

  let archivedSourceCount = 0;
  let writeFailureCount = 0;
  for (const source of committedSources) {
    const { page } = source;
    if (page.id === writtenCanonicalId) {
      continue;
    }
    try {
      // A merge may only consume the source snapshot incorporated into the committed canonical.
      // Chasing a conflict here could archive a newer source that the canonical does not contain.
      await store.archiveVersioned(source, 'merged');
      archivedSourceCount += 1;
    } catch (err) {
      writeFailureCount += 1;
      logger.warn('Memory merge wrote canonical but failed to archive a source');
      logger.debug(`Memory merge archive failed source=${page.id}: ${String(err)}`);
    }
  }
  logger.debug(
    `Merged ${committedSources.map(({ page }) => page.id).join(', ')} into ${writtenCanonicalId}` +
      ` (entry ${extract.slug})`
  );
  return {
    writtenId: writtenCanonicalId,
    sourceCount: committedSources.length,
    archivedSourceCount,
    writeFailureCount,
  };
};

export const optimizeMemory = async ({
  store,
  recalledIds,
  proposeLabels,
  proposeExtractions,
  synthesizeMemoryGroup,
  userMessage,
  assistantMessage,
  toolCalls,
  investigation,
  agentId,
  conversationId,
  logger,
  signal,
}: {
  store: MemoryPageStore;
  recalledIds: string[];
  proposeLabels: ProposeMemoryLabels;
  proposeExtractions: ProposeMemoryExtractions;
  synthesizeMemoryGroup?: SynthesizeMemoryGroup;
  userMessage: string;
  assistantMessage: string;
  /** Parameters-only fallback for when the round's steps could not be read. */
  toolCalls: InvestigationToolCall[];
  /** The round's steps in order with tool results, when the persisted round could be read. */
  investigation?: TranscriptStep[];
  /** Provenance stamped on pages this run writes. Metadata only. */
  agentId?: string;
  conversationId?: string;
  logger: Logger;
  /** Aborted on step timeout or workflow cancellation; no later LLM call or write starts. */
  signal?: AbortSignal;
}): Promise<MemoryOptimizeSummary> => {
  logger.debug(
    `Memory optimize start recalledIds=${recalledIds.length} ` +
      `[${recalledIds.join(', ') || '(none)'}] userChars=${userMessage.length} ` +
      `assistantChars=${assistantMessage.length} toolCalls=${toolCalls.length} ` +
      `transcriptSource=${investigation ? 'round-steps' : 'tool-call-params'} ` +
      `user=${JSON.stringify(previewText(userMessage))}`
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
  const transcript = renderMemoryTranscript({
    task,
    answer: assistantMessage,
    investigation,
    toolCalls,
    evidenceOnly: true,
  });
  const evidenceTranscript = renderMemoryTranscript({
    task,
    investigation,
    toolCalls,
    evidenceOnly: true,
  });

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
  signal?.throwIfAborted();
  let extractions: MemoryExtractProposal[] = [];
  if (assistantMessage.trim().length === 0) {
    logger.debug('Memory extract skipped — empty assistant message');
  } else if (!hasToolEvidence(investigation)) {
    logger.debug('Memory extract skipped — no evidence tool results to extract from');
  } else {
    const extractStarted = Date.now();
    logger.debug(
      `Memory extract LLM start nightshift_memory_extract recalled=${recalledMemories.length} ` +
        `transcriptChars=${evidenceTranscript.length}`
    );
    const extracted = await proposeExtractions({
      transcript: evidenceTranscript,
      recalledMemories,
    });
    extractions = extracted.extractions;
    logger.debug(
      `Memory extract LLM done ${Date.now() - extractStarted}ms ` +
        `proposals=${extractions.length} ` +
        (extractions.length === 0
          ? '(none)'
          : extractions
              .map(
                (extra) =>
                  `${extra.slug} "${previewText(extra.title, 60)}" replaces=${
                    extra.replaces.length
                  }`
              )
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

  signal?.throwIfAborted();
  const editSummary = await applyMemoryEdits({
    store,
    recalledIds,
    recalledMemories,
    labels,
    extractions,
    context: task,
    transcript: evidenceTranscript,
    agentId,
    conversationId,
    synthesizeMemoryGroup,
    logger,
  });
  return {
    ...editSummary,
    recalledCount: recalledIds.length,
    loadedCount: recalledMemories.length,
  };
};
