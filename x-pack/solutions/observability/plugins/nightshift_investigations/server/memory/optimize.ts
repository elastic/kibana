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
import { renderMemoryTranscript, type TranscriptStep } from './transcript';
import type { MemoryPageStore, VersionedMemoryPage } from './page_store';
import {
  canonicalizeSlug,
  epochSecondsToIso,
  toMemoryDisplayTelemetry,
  toMemoryKiId,
} from './page_store';
import { toCounterUpdates } from './ranking';
import { type MemoryPage } from '../../common/memory';

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

export const MEMORY_EXTRACT_SYSTEM_PROMPT = `You are a knowledge distillation engine for an AI SRE assistant. After each conversation you propose **up to 3** memory entries. Each entry is one topic: reusable facts that would help the same assistant on a *similar but not exactly the same* task in this same customer environment in the future. An entry is either new, or replaces recalled memories that this conversation corrects, extends, or shows to be duplicates.

Focus strictly on durable, tool-output-verifiable knowledge about the customer's environment — how this organization's systems are structured and how its components behave. Do **not** extract generic tool, connector, or API usage — that belongs to the tool/connector's own documentation, not to per-customer memory.`;

export const MEMORY_EXTRACT_GUIDELINES = `Review the conversation. Extract only facts that are directly substantiated by the transcript.

The transcript has the user task; the investigation, in order (the agent's notes and every tool call with an excerpt of its result, where "ERROR" marks a failed call); and the final answer. Some calls only read the agent's own stored knowledge: other memories (/workspace/memories/), Cortex wiki pages (/workspace/cortex/), decision trees (/workspace/decision-trees/), and environment docs (/workspace/elastic.md, /workspace/connectors.md). Whatever they return is already stored, so it is not new evidence. Never restate information from Cortex, other memories, or decision trees, even when the final answer repeats it. The one exception is a recalled memory this run corrects, extends, or duplicates: replace it (see NEW OR REPLACE).

Extract a fact only if a tool result in the investigation shows it. The final answer is a synthesis that can include the agent's inferences, so it is not evidence by itself. A failed call shows nothing about the environment. If results are unavailable (the section says so), you cannot see what any call returned, and the final answer is the only source. The answer often restates what the agent read from its own stored knowledge: anything it attributes to memories (/workspace/memories/), Cortex pages (/workspace/cortex/), decision trees (/workspace/decision-trees/), postmortems, runbooks, or earlier incidents is already stored, so do not restate it. Extract only what the answer says it observed in this environment during this run, through queries the tool calls show were actually run. Skip its inferences, hypotheses, and recommendations. When unsure, return an empty list.

**EXTRACT** — durable customer-environment knowledge:
- Organizational context: team ownership, on-call structure, service → team mapping, escalation paths, naming conventions.
- System component behavior: what a service/job does, its upstream/downstream dependencies, typical traffic/latency/error profile, known failure modes.
- Environment topology: how services are named in traces/logs/metrics, how environments (prod/stage/etc.) are labeled, which hosts/clusters/regions serve what role.

**NEVER EXTRACT:**
- Knowledge already present in the memories recalled for this session — repeating it just bloats the store. To correct, extend, or combine recalled memories, replace them instead.
- Common-sense or generic knowledge that isn't specific to this customer's environment (e.g. "Prometheus exposes /api/v1/query", "K8s pods restart on OOM").
- Connector/tool mechanics: hosts, auth methods, base paths, tenant IDs, API endpoint patterns, query syntax, request/response shapes.
- Generic "how to use X" tips that would apply to any customer running the same tool.
- "How we investigated this" narratives — capture the *facts* the investigation uncovered, not the procedure.
- Tool errors, broken environments, or workarounds for failures.
- Negation / absence ("X doesn't exist", "no doc found").
- Credentials, tokens, or secrets.
- Container internals (/proc, hex ports, Docker layers).
- Information only relevant to this specific request (e.g. the single alert fingerprint being investigated).
- Single-run details: timestamps, time windows, counts, percentiles, or ids from this run. Distil them into a reusable claim, or leave them out.

**NEW OR REPLACE** — every entry has a title (its topic), content, replaces, and note. A writer turns each entry into the stored memory, and every memory in replaces is archived once it is written.
- New topic: replaces is empty, content holds the facts, note is empty.
- This run corrects or extends a recalled memory: replaces lists its id. content holds only what this run adds or corrects; the writer keeps what is still right in the replaced memory. note says what this run showed and what in the replaced memory is wrong or outdated.
- Several recalled memories cover the same topic: replaces lists all of them. content holds anything this run adds, or is empty. note says what they share and anything that conflicts.
- Replace a memory only when this run's evidence justifies it. A recalled memory that is still right and complete needs no entry.
- The single-run rule applies to replacing entries too. Measurements from one time window (counts, averages, percentiles) are not durable: state the lasting pattern they show, such as which component is consistently slowest, or propose nothing.
- The title names the topic as it should read now; for an unchanged topic, reuse the replaced memory's wording.

Keep entries concise. Return an empty list if the conversation produced no reusable environment knowledge.`;

export interface MemoryLabelProposal {
  useful: string[];
  harmful: string[];
}

export interface MemoryExtractProposal {
  slug: string;
  title: string;
  /** What this run adds or corrects. Empty when the entry only combines the replaced memories. */
  content: string;
  tags: string[];
  categories: string[];
  /** Recalled memory ids this entry supersedes; they are archived once it is written. */
  replaces: string[];
  /** For the writer: what this run showed and what in the replaced memories is wrong or outdated. */
  note: string;
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
  extract: MemoryExtractProposal;
  task?: string;
}) => Promise<MemoryMergeSynthesis>;

/** Normalize the user-authored task without interpreting literal prompt content. */
export const unwrapUserTask = (prompt: string | undefined): string => {
  return prompt?.trim() ?? '';
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

export const OPTIMIZER_MIN_CONTEXT_WINDOW_TOKENS = 256_000;
export const OPTIMIZER_EVIDENCE_TOKEN_BUDGET = 128_000;
export const OPTIMIZER_OUTPUT_TOKEN_LIMIT = 8_000;
export const OPTIMIZER_EVIDENCE_CHARACTER_HARD_LIMIT = 2_000_000;
export const MAX_RECALLED_TITLE_CHARS = 256;
export const MAX_RECALLED_CONTEXT_CHARS = 1_024;

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
      prefix: `${index === 0 ? '' : '\n'}- id=${memory.id}\n` + `  content: `,
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
                content: {
                  type: 'string',
                  description: 'What this run adds or corrects. May be empty only when replacing.',
                },
                replaces: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Recalled memory ids (the id= value) this entry supersedes.',
                },
                note: {
                  type: 'string',
                  description:
                    'For the writer when replacing: what this run showed and what in the replaced ' +
                    'memories is wrong or outdated.',
                },
                tags: { type: 'array', items: { type: 'string' } },
                categories: { type: 'array', items: { type: 'string' } },
              },
              required: ['title', 'content', 'replaces'],
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
            content: String(candidate.content ?? '').trim(),
            tags: Array.isArray(candidate.tags) ? candidate.tags.map(String) : [],
            categories: Array.isArray(candidate.categories) ? candidate.categories.map(String) : [],
            replaces: Array.isArray(candidate.replaces)
              ? canonicalizeMemoryLabelIds(candidate.replaces.map(String))
              : [],
            note: String(candidate.note ?? '').trim(),
          };
        })
        .filter(
          (entry): entry is MemoryExtractProposal =>
            entry !== undefined &&
            entry.slug.length > 0 &&
            entry.title.length > 0 &&
            (entry.content.length > 0 || entry.replaces.length > 0)
        )
        .slice(0, MAX_EXTRACTIONS),
    };
  };
};

export const MEMORY_WRITER_SYSTEM_PROMPT = `You write one semantic memory for an AI SRE assistant: durable facts about one topic in the customer's environment.

You get the topic, a note on why the entry is being written, the new information from this run, and the stored memories it replaces. The replaced memories are archived once your entry is written, so anything worth keeping from them must be in your content.
- Keep the facts from the replaced memories that are still correct and useful.
- Where the new information or the note contradicts a replaced memory, keep the new information and drop the contradicted claim.
- Drop what is outdated, not useful, or a single-run detail (timestamps, time windows, counts, percentiles, ids from one run).
- Describe the environment as it is now. Never keep a history of earlier observations; when a newer observation supersedes an older one, keep only the durable conclusion.
- The note explains what changed; these rules still apply where it suggests otherwise.
- State each fact once. Add nothing that is in neither the new information nor the replaced memories: no new sections, fixes, or recommendations.
- Be concise: no longer than the longest input unless the facts need it.

Return markdown content and context.
context is the recall key: compact, semantically rich phrases covering the union of the replaced memories' contexts and this round's task goal. Not verbatim sentences. Not a concatenation of full prompts. Not one task copied when the others differ.
If you cannot write a non-empty context that covers that union, return an empty context string.`;

export const MAX_MERGE_TASK_TOKENS = 4_096;

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
              prefix:
                `Topic: ${extract.title.slice(0, MAX_RECALLED_TITLE_CHARS)}\n` +
                `Note: ${extract.note || '(none)'}\n` +
                `New information from this run:\n`,
              content: extract.content || '(none)',
            },
          ]
        : []),
      ...sources.map((page, index) => ({
        prefix:
          `${index === 0 ? (extract ? '\n\nMemories this entry replaces:\n' : '') : '\n'}` +
          `- id=${page.id}\n` +
          `  context: ${(page.context ?? '').slice(0, MAX_RECALLED_CONTEXT_CHARS)}\n` +
          `  content: `,
        content: page.content,
      })),
    ],
    maxTokens
  );

export const createLlmSynthesizeMemoryGroup = ({
  inferenceClient,
  signal,
}: {
  inferenceClient: BoundInferenceClient;
  signal?: AbortSignal;
}): SynthesizeMemoryGroup => {
  return async ({ sources, extract, task }) => {
    const taskText = task ? truncateTokens(task, MAX_MERGE_TASK_TOKENS) : '';
    const taskBlock = taskText
      ? `\n\nThis round's original task (cover its goal in context; do not copy it verbatim): ${taskText}`
      : '';
    const framingTokens = estimateTokens(taskBlock);
    const entryBlock = formatMemoryMergeSources({
      sources,
      extract,
      maxTokens: Math.max(0, OPTIMIZER_EVIDENCE_TOKEN_BUDGET - framingTokens),
    });
    const response = await inferenceClient.output({
      id: 'nightshift_memory_write',
      abortSignal: signal,
      system: MEMORY_WRITER_SYSTEM_PROMPT,
      input: `${entryBlock}${taskBlock}`,
      schema: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          context: { type: 'string' },
        },
        required: ['content', 'context'],
      },
    });
    return {
      content: String(response.output?.content ?? '').trim(),
      context: String(response.output?.context ?? '').trim(),
    };
  };
};

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

export const applyMemoryEdits = async ({
  store,
  recalledIds,
  recalledMemories = [],
  labels,
  extractions,
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
  // A harmful memory that an entry replaces stays live until that entry is written, so the
  // writer can keep what is still right in it; it is archived afterwards if nothing replaced it.
  const replacedIds = new Set(extractions.flatMap((extra) => extra.replaces));
  const deferredHarmfulIds = archiveIds.filter((id) => replacedIds.has(id));
  for (const id of archiveIds) {
    if (replacedIds.has(id)) {
      continue;
    }
    await store.archive(id, 'harmful');
    summary.harmfulArchiveCount += 1;
    logger.debug(`Memory archived ${id} reason=harmful`);
  }
  await store.applyCounterUpdates(updates);

  const task = unwrapUserTask(context);
  const consumedIds = new Set<string>();
  const consumedExtracts = new Set<number>();
  // Pages an entry was written to or archived into an entry this round.
  const replacedDoneIds = new Set<string>();

  interface MergeGroup {
    sourceIds: string[];
    extract: MemoryExtractProposal;
    canonicalId?: string;
  }
  const groups: MergeGroup[] = [];

  for (let index = 0; index < extractions.length; index++) {
    const extra = extractions[index];
    logger.debug(
      `Memory extraction candidate slug=${extra.slug} title=${JSON.stringify(
        previewText(extra.title, 80)
      )} content=${JSON.stringify(previewText(extra.content))} ` +
        `tags=${extra.tags.join(',') || '(none)'} replaces=[${extra.replaces.join(', ')}]`
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
    const named = recalledMemories.filter(
      (page) => extra.replaces.includes(page.id) && page.status !== 'archived'
    );
    const unknownReplaces = extra.replaces.filter((id) => !named.some((page) => page.id === id));
    if (unknownReplaces.length > 0) {
      logger.debug(
        `Extraction "${extra.slug}" names ${unknownReplaces.length} replace id(s) that are not ` +
          `live recalled memories: [${unknownReplaces.join(', ')}]`
      );
    }
    // Lexical overlap still catches a near-duplicate the model did not name, e.g. a page
    // that was not recalled this round.
    const unnamedOverlaps = liveOverlapPages({
      extra,
      recalledIds,
      recalledMemories,
      catalogHits: exactPage ? [exactPage, ...catalogHits] : catalogHits,
    }).filter((page) => !named.some((source) => source.id === page.id));
    const live = [...named, ...unnamedOverlaps];
    if (live.some((page) => consumedIds.has(page.id))) {
      // A prior entry already replaces this source. Consuming later proposals avoids
      // publishing another live page for the same fact.
      logger.debug(`Skipped extraction "${extra.slug}" — a source already belongs to an entry`);
      consumedExtracts.add(index);
      continue;
    }
    if (unnamedOverlaps.some((page) => harmful.has(page.id))) {
      logger.debug(
        `Skipped extraction "${extra.slug}" — it overlaps a harmful memory it does not replace`
      );
      consumedExtracts.add(index);
      continue;
    }
    if (live.length === 0) {
      if (extra.content.length === 0) {
        logger.debug(`Skipped extraction "${extra.slug}" — no content and nothing to replace`);
        consumedExtracts.add(index);
      }
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
      `Memory entry "${extra.slug}" replaces named=${formatPageRefs(named)} ` +
        `overlap=${formatPageRefs(unnamedOverlaps)} (catalog=${formatPageRefs(catalogHits)})`
    );
  }

  for (const group of groups) {
    if (!synthesizeMemoryGroup) {
      logger.warn('Memory merge skipped — no synthesizer configured');
      continue;
    }
    summary.mergeAttemptCount += 1;
    const mergeResult = await mergeMemoryGroup({
      store,
      sourceIds: group.sourceIds,
      extract: group.extract,
      canonicalId: group.canonicalId,
      task,
      synthesizeMemoryGroup,
      now,
      logger,
    });
    if (mergeResult.writtenId) {
      summary.mergeSuccessCount += 1;
      replacedDoneIds.add(mergeResult.writtenId);
    }
    for (const id of mergeResult.archivedSourceIds ?? []) {
      replacedDoneIds.add(id);
    }
    summary.mergedSourceArchiveCount += mergeResult.archivedSourceCount;
    summary.writeFailureCount += mergeResult.writeFailureCount;
  }

  for (const id of deferredHarmfulIds) {
    if (replacedDoneIds.has(id)) {
      continue;
    }
    const page = await store.get(id);
    if (!page || page.status === 'archived') {
      continue;
    }
    await store.archive(id, 'harmful');
    summary.harmfulArchiveCount += 1;
    logger.debug(`Memory archived ${id} reason=harmful (no entry replaced it)`);
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
      if (isElasticsearchWriteConflict(err)) {
        const winner = await store.get(toMemoryKiId(extra.slug));
        if (winner?.status === 'archived') {
          logger.debug(`Skipped extraction "${extra.slug}" — race winner is archived`);
          continue;
        }
        if (winner && synthesizeMemoryGroup) {
          summary.mergeAttemptCount += 1;
          const mergeResult = await mergeMemoryGroup({
            store,
            sourceIds: [winner.id],
            extract: extra,
            canonicalId: winner.id,
            task,
            synthesizeMemoryGroup,
            now,
            logger,
          });
          if (mergeResult.writtenId) {
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
  /** The page the entry was written to; unset when nothing was written. */
  writtenId?: string;
  archivedSourceIds?: string[];
  archivedSourceCount: number;
  writeFailureCount: number;
}

const mergeMemoryGroup = async ({
  store,
  sourceIds: initialSourceIds,
  extract,
  canonicalId: initialCanonicalId,
  task,
  synthesizeMemoryGroup,
  now,
  logger,
}: {
  store: MemoryPageStore;
  sourceIds: string[];
  extract: MemoryExtractProposal;
  canonicalId?: string;
  task: string;
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
    const unavailableIndex = sourceSnapshots.findIndex(
      (source) => !source || source.page.status === 'archived'
    );
    if (unavailableIndex !== -1) {
      logger.debug(
        `Memory merge aborted — required source ${requiredSourceIds[unavailableIndex]} is missing or archived`
      );
      return { archivedSourceCount: 0, writeFailureCount: 0 };
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
        task,
      });
    } catch (err) {
      logger.warn('Memory merge synthesis failed');
      logger.debug(`Memory merge synthesis error: ${(err as Error).message}`);
      return { archivedSourceCount: 0, writeFailureCount: 1 };
    }

    const content = capMergedContent(synthesis.content);
    // A page's title and slug are set once, together; writing into an existing canonical page
    // keeps both, and only a newly minted canonical page takes the entry's topic.
    const title = versionedCanonical?.page.title ?? extract.title;
    if (title.length === 0 || content.trim().length === 0) {
      logger.warn('Memory merge aborted — synthesis returned an empty title or content');
      return { archivedSourceCount: 0, writeFailureCount: 0 };
    }
    if (
      looksLikeSecret(
        [
          title,
          content,
          synthesis.context,
          extract.tags.join('\n'),
          extract.categories.join('\n'),
        ].join('\n')
      )
    ) {
      logger.warn('Memory merge aborted — synthesised content looks like a secret');
      return { archivedSourceCount: 0, writeFailureCount: 0 };
    }
    const hadRecallKey =
      currentSources.some((page) => (page.context ?? '').trim().length > 0) || task.length > 0;
    if (synthesis.context.length === 0 && hadRecallKey) {
      logger.warn('Memory merge aborted — synthesis returned an empty recall context');
      return { archivedSourceCount: 0, writeFailureCount: 0 };
    }

    let slug = versionedCanonical?.page.slug;
    if (!slug) {
      const avoid = new Set(currentSources.map((page) => page.id));
      const base = canonicalizeSlug(title) || 'merged';
      for (let slugAttempt = 0; slugAttempt < 6; slugAttempt++) {
        const suffix =
          slugAttempt === 0 ? '' : slugAttempt === 1 ? '-merged' : `-merged-${slugAttempt}`;
        const candidate = `${base.slice(0, 80 - suffix.length)}${suffix}`;
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
        return { archivedSourceCount: 0, writeFailureCount: 0 };
      }
    }

    const mergedFrom = unionStrings(
      currentSources.flatMap((page) => [page.id, ...(page.merged_from ?? [])]),
      [toMemoryKiId(extract.slug)]
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
      title,
      content,
      context: synthesis.context,
      tags: unionStrings(
        currentSources.flatMap((page) => page.tags),
        extract.tags
      ).filter((tag) => tag !== 'memory'),
      categories: unionStrings(
        currentSources.flatMap((page) => page.categories),
        extract.categories
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
      return { archivedSourceCount: 0, writeFailureCount: 1 };
    }

    const validatedSources = await Promise.all(
      requiredSourceIds.map(async (id) => store.getVersioned(id))
    );
    const unavailableAfterSynthesisIndex = validatedSources.findIndex(
      (source) => !source || source.page.status === 'archived'
    );
    if (unavailableAfterSynthesisIndex !== -1) {
      logger.debug(
        `Memory merge aborted after synthesis — required source ${requiredSourceIds[unavailableAfterSynthesisIndex]} is missing or archived`
      );
      return { archivedSourceCount: 0, writeFailureCount: 0 };
    }
    const revalidatedSources = validatedSources as VersionedMemoryPage[];
    const sourceChanged = versionedSources.some((source, index) => {
      const validated = revalidatedSources[index];
      return validated.seqNo !== source.seqNo || validated.primaryTerm !== source.primaryTerm;
    });
    if (sourceChanged) {
      if (attempt === 2) {
        logger.warn('Memory merge exhausted source changes; sources preserved');
        return { archivedSourceCount: 0, writeFailureCount: 1 };
      }
      continue;
    }

    try {
      if (versionedCanonical) {
        await store.update(targetCanonicalId, write, versionedCanonical);
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
        return { archivedSourceCount: 0, writeFailureCount: 1 };
      }
      if (attempt === 2) {
        logger.warn('Memory merge exhausted version conflicts; sources preserved');
        logger.debug(`Memory merge conflict exhaustion canonical=${targetCanonicalId}`);
        return { archivedSourceCount: 0, writeFailureCount: 1 };
      }
      canonicalIsSource = true;
    }
  }

  if (!writtenCanonicalId) {
    return { archivedSourceCount: 0, writeFailureCount: 1 };
  }

  const archivedSourceIds: string[] = [];
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
      archivedSourceIds.push(page.id);
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
    archivedSourceIds,
    archivedSourceCount: archivedSourceIds.length,
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
  const shouldExtract = assistantMessage.trim().length > 0;
  let extractions: MemoryExtractProposal[] = [];
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
    synthesizeMemoryGroup,
    logger,
  });
  return {
    ...editSummary,
    recalledCount: recalledIds.length,
    loadedCount: recalledMemories.length,
  };
};
