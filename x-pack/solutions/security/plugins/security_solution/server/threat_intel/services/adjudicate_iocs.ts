/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import { MAX_IOC_TIER_BASIS_LENGTH } from '../../../common/threat_intel/contracts/enrichment';
import type { ExtractedIoc, ExtractIocsResult, IocTier } from './extract_iocs';

const SEMANTIC_INDICATOR_PREFIX = 'semantic_indicator:';

/** Prefix an approved candidate's basis without exceeding response schema bounds. */
const semanticIndicatorBasis = (basis: string): string =>
  `${SEMANTIC_INDICATOR_PREFIX}${basis}`.slice(0, MAX_IOC_TIER_BASIS_LENGTH);

/** Candidates per model call (matches approved_ioc_candidate_ids schema max). */
export const MAX_SEMANTIC_CANDIDATES_PER_BATCH = 300;
/**
 * Hard cap on adjudication *batches* (candidate groups of MAX_SEMANTIC_CANDIDATES_PER_BATCH),
 * not on model calls. `enrichReportCore` folds the first batch into the core
 * extraction call, then re-chunks whatever is left over into up to this many more
 * follow-up calls — so an IOC-rich report can reach 1 + MAX_SEMANTIC_REVIEW_BATCHES
 * model calls in total, not MAX_SEMANTIC_REVIEW_BATCHES.
 */
export const MAX_SEMANTIC_REVIEW_BATCHES = 3;
/** Cap for the first context-overflow retry so candidate JSON cannot re-overflow. */
export const OVERFLOW_MAX_SEMANTIC_CANDIDATES = 50;
/**
 * Second overflow retry: count alone is not enough when values are near the URL
 * length bound. Keep a small set and truncate value/context by payload budget.
 */
export const OVERFLOW_RETRY2_MAX_SEMANTIC_CANDIDATES = 15;
export const OVERFLOW_RETRY2_MAX_PAYLOAD_CHARS = 12_000;
export const OVERFLOW_RETRY2_MAX_VALUE_CHARS = 256;
const OVERFLOW_CONTEXT_CHARS = 120;
const OVERFLOW_RETRY2_CONTEXT_CHARS = 40;
const PROMOTABLE_TIERS: ReadonlySet<IocTier> = new Set([
  'discriminating',
  'contextual',
  'uncertain',
]);

export interface AdjudicateIocsParams {
  text: string;
  iocs: ExtractedIoc[];
  title?: string;
  article_url?: string;
  truncated?: boolean;
}

export interface AdjudicateIocsResult extends ExtractIocsResult {
  anchor_iocs: ExtractedIoc[];
  promotable_count: number;
  adjudication: {
    provider: 'semantic_model';
    reviewed: number;
    approved: number;
    downgraded: number;
    deterministic_references: number;
    /** Candidates held at heuristic tier because batch capacity was exhausted. */
    deferred_unreviewed: number;
  };
}

export interface IocAdjudicationCandidate {
  id: number;
  originalIndex: number;
  ioc: ExtractedIoc;
  context: string;
  /**
   * Set when this candidate's value/context were truncated by the second
   * context-overflow retry (`boundIocAdjudicationForPayload`). A rejection
   * verdict on degraded evidence gets a distinct `tier_basis` so it is not
   * indistinguishable from a full-evidence `semantic_reference` rejection.
   */
  degraded?: boolean;
}

export interface PreparedIocAdjudication {
  output: ExtractedIoc[];
  reviewable: IocAdjudicationCandidate[];
  deterministicReferences: number;
  deferredUnreviewed: number;
}

/**
 * Deterministic correlation fingerprint matching `extract_iocs`: every
 * non-reference/non-denied value, independent of model adjudication or deferral.
 */
export const hashIocSet = (iocs: readonly ExtractedIoc[]): string | null => {
  const eligible = iocs.filter((ioc) => ioc.tier !== 'reference' && ioc.tier !== 'denied');
  if (eligible.length === 0) return null;
  return createHash('sha256')
    .update(
      eligible
        .map((ioc) => ioc.value.toLowerCase())
        .sort()
        .join('\n')
    )
    .digest('hex');
};

const originFor = (value: string): string | undefined => {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return undefined;
  }
};

const hostnameFor = (value: string): string | undefined => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return undefined;
  }
};

const isSameOrigin = (ioc: ExtractedIoc, articleUrl?: string): boolean => {
  if (!articleUrl) return false;
  if (ioc.type === 'url') {
    const articleOrigin = originFor(articleUrl);
    const iocOrigin = originFor(ioc.value);
    return Boolean(articleOrigin && iocOrigin && articleOrigin === iocOrigin);
  }
  const articleHost = hostnameFor(articleUrl);
  if (!articleHost) return false;
  return ioc.type === 'domain' && ioc.value.toLowerCase() === articleHost;
};

const isSemanticCandidate = (ioc: ExtractedIoc): boolean =>
  (ioc.type === 'url' || ioc.type === 'domain') && PROMOTABLE_TIERS.has(ioc.tier);

const tierPriority = (tier: IocTier): number => {
  if (tier === 'discriminating') return 0;
  if (tier === 'contextual') return 1;
  return 2;
};

const downgrade = (ioc: ExtractedIoc, basis: string): ExtractedIoc => ({
  ...ioc,
  tier: 'reference',
  tier_basis: basis,
});

export const chunkIocAdjudicationBatches = (
  reviewable: IocAdjudicationCandidate[],
  batchSize: number = MAX_SEMANTIC_CANDIDATES_PER_BATCH,
  maxBatches: number = MAX_SEMANTIC_REVIEW_BATCHES
): { batches: IocAdjudicationCandidate[][]; deferred: IocAdjudicationCandidate[] } => {
  const capacity = batchSize * maxBatches;
  const inBudget = reviewable.slice(0, capacity);
  const deferred = reviewable.slice(capacity);
  const batches: IocAdjudicationCandidate[][] = [];
  for (let index = 0; index < inBudget.length; index += batchSize) {
    batches.push(inBudget.slice(index, index + batchSize));
  }
  return { batches, deferred };
};

export const prepareIocAdjudication = (
  params: Pick<AdjudicateIocsParams, 'iocs' | 'article_url'>
): PreparedIocAdjudication => {
  const output = [...params.iocs];
  let deterministicReferences = 0;

  const candidates = params.iocs
    .map((ioc, originalIndex) => ({ ioc, originalIndex }))
    .filter(({ ioc }) => isSemanticCandidate(ioc))
    .filter(({ ioc, originalIndex }) => {
      // Same-origin article links are citations. Markdown link destinations are
      // not: Jina renders payload URLs as `[label](url)` too, so leave those for
      // semantic review instead of discarding them before the model sees them.
      if (isSameOrigin(ioc, params.article_url)) {
        output[originalIndex] = downgrade(ioc, 'semantic_reference_deterministic');
        deterministicReferences += 1;
        return false;
      }
      return true;
    })
    .sort(
      (left, right) =>
        tierPriority(left.ioc.tier) - tierPriority(right.ioc.tier) ||
        left.originalIndex - right.originalIndex
    );

  // Apply the call budget before batching: an IOC-rich report cannot spend an
  // unbounded number of model calls.
  const capacity = MAX_SEMANTIC_CANDIDATES_PER_BATCH * MAX_SEMANTIC_REVIEW_BATCHES;
  const deferredCount = Math.max(0, candidates.length - capacity);
  const inBudget = candidates.slice(0, capacity);

  const withContext = inBudget.map((candidate) => ({
    ...candidate,
    id: candidate.originalIndex,
    // extract_iocs already located the best occurrence and sliced this window;
    // adjudication no longer re-finds the (already-normalized) value in the article.
    context: candidate.ioc.context ?? '',
  }));

  // A candidate extract_iocs never located in the article cannot be judged.
  // Sending it anyway produces a predictable model rejection that is stored as
  // `semantic_reference`, indistinguishable from a real one, so defer it instead.
  const reviewable = withContext.filter((candidate) => candidate.context.length > 0);
  const unmatchedCount = withContext.length - reviewable.length;

  const { batches } = chunkIocAdjudicationBatches(reviewable);
  // Deferred candidates keep their heuristic tier. They are not a negative
  // model verdict, just past the batch budget for this enrichment run (or, for
  // unmatchedCount, never had a context window to send).

  return {
    output,
    reviewable: batches.flat(),
    deterministicReferences,
    deferredUnreviewed: deferredCount + unmatchedCount,
  };
};

/**
 * Keep a maxChars window centered on the IOC mention. A leading prefix slice
 * would drop the URL/domain when `contextFor` already spent its budget on
 * preceding prose.
 */
const shrinkContextAroundIoc = (context: string, value: string, maxChars: number): string => {
  if (context.length <= maxChars) return context;
  // Prefer an exact match so case-sensitive URL paths stay centered correctly.
  let index = context.indexOf(value);
  if (index < 0) {
    index = context.toLowerCase().indexOf(value.toLowerCase());
  }
  if (index < 0) {
    const start = Math.max(0, Math.floor((context.length - maxChars) / 2));
    return context.slice(start, start + maxChars);
  }
  // When the value alone would fill the window, still keep attribution prose.
  // Prefer characters before the IOC (cues usually precede the value); when the
  // mention is near the start, the remainder of the window covers trailing prose.
  if (value.length >= maxChars) {
    const proseBudget = Math.max(24, Math.floor(maxChars / 3));
    const before = Math.min(index, proseBudget);
    const start = Math.max(0, index - before);
    return context.slice(start, start + maxChars);
  }
  const before = Math.floor((maxChars - value.length) / 2);
  const start = Math.max(0, Math.min(index - before, context.length - maxChars));
  return context.slice(start, start + maxChars);
};

export const candidatePayloadChars = (candidates: IocAdjudicationCandidate[]): number =>
  JSON.stringify(
    candidates.map(({ id, ioc, context }) => ({
      id,
      type: ioc.type,
      value: ioc.value,
      context,
    }))
  ).length;

/**
 * Shrink the candidate set and per-candidate context for a confirmed context
 * overflow retry. Skipped candidates are omitted from `reviewable` only; their
 * heuristic tiers stay intact so they are not treated as model rejections.
 */
export const boundIocAdjudicationForOverflow = (
  prepared: PreparedIocAdjudication,
  maxCandidates: number = OVERFLOW_MAX_SEMANTIC_CANDIDATES,
  maxContextChars: number = OVERFLOW_CONTEXT_CHARS
): PreparedIocAdjudication => {
  const kept = prepared.reviewable.slice(0, maxCandidates).map((candidate) => ({
    ...candidate,
    context: shrinkContextAroundIoc(candidate.context, candidate.ioc.value, maxContextChars),
  }));
  const skipped = prepared.reviewable.length - kept.length;
  return {
    output: prepared.output,
    reviewable: kept,
    deterministicReferences: prepared.deterministicReferences,
    deferredUnreviewed: prepared.deferredUnreviewed + skipped,
  };
};

/**
 * Truncate a long IOC value for an overflow prompt while keeping both ends so
 * path suffixes remain distinguishable (`…` marks the omitted middle).
 */
export const truncateValuePreservingEnds = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value;
  const ellipsis = '…';
  if (maxChars <= ellipsis.length + 2) return value.slice(0, maxChars);
  const budget = maxChars - ellipsis.length;
  const head = Math.ceil(budget / 2);
  const tail = Math.floor(budget / 2);
  return `${value.slice(0, head)}${ellipsis}${value.slice(-tail)}`;
};

const promptIdentity = (type: string, value: string): string => `${type}:${value}`;

/**
 * Further shrink an already overflow-bounded candidate set by truncating values
 * and dropping candidates until the JSON payload fits a small reasoning window.
 * Truncation keeps path suffixes; any remaining identical prompt copies are
 * deferred rather than sent as ambiguous duplicates.
 */
export const boundIocAdjudicationForPayload = (
  prepared: PreparedIocAdjudication,
  maxPayloadChars: number = OVERFLOW_RETRY2_MAX_PAYLOAD_CHARS,
  maxCandidates: number = OVERFLOW_RETRY2_MAX_SEMANTIC_CANDIDATES,
  maxValueChars: number = OVERFLOW_RETRY2_MAX_VALUE_CHARS,
  maxContextChars: number = OVERFLOW_RETRY2_CONTEXT_CHARS
): PreparedIocAdjudication => {
  const truncated = prepared.reviewable.slice(0, maxCandidates).map((candidate) => {
    const originalValue = candidate.ioc.value;
    return {
      ...candidate,
      ioc: {
        ...candidate.ioc,
        value: truncateValuePreservingEnds(originalValue, maxValueChars),
        defanged: candidate.ioc.defanged
          ? truncateValuePreservingEnds(candidate.ioc.defanged, maxValueChars)
          : undefined,
      },
      // Center on the original value before truncating the prompt copy.
      context: shrinkContextAroundIoc(candidate.context, originalValue, maxContextChars),
      degraded: true,
    };
  });

  // If two long URLs still collide after end-preserving truncation, defer the
  // duplicates so a single ambiguous prompt cannot verdict the wrong original.
  const seenPromptIds = new Set<string>();
  const unique: IocAdjudicationCandidate[] = [];
  for (const candidate of truncated) {
    const key = promptIdentity(candidate.ioc.type, candidate.ioc.value);
    if (!seenPromptIds.has(key)) {
      seenPromptIds.add(key);
      unique.push(candidate);
    }
  }

  let kept = unique;
  while (kept.length > 1 && candidatePayloadChars(kept) > maxPayloadChars) {
    kept = kept.slice(0, Math.max(1, Math.floor(kept.length / 2)));
  }
  if (candidatePayloadChars(kept) > maxPayloadChars && kept.length === 1) {
    const [only] = kept;
    const room = Math.max(32, maxPayloadChars - 80);
    kept = [
      {
        ...only,
        ioc: {
          ...only.ioc,
          value: truncateValuePreservingEnds(only.ioc.value, room),
          defanged: only.ioc.defanged
            ? truncateValuePreservingEnds(only.ioc.defanged, room)
            : undefined,
        },
        context: '',
      },
    ];
  }

  const skipped = prepared.reviewable.length - kept.length;
  return {
    output: prepared.output,
    reviewable: kept,
    deterministicReferences: prepared.deterministicReferences,
    deferredUnreviewed: prepared.deferredUnreviewed + Math.max(0, skipped),
  };
};

export const reconcileIocAdjudication = (
  prepared: PreparedIocAdjudication,
  approvedIds: ReadonlySet<number>,
  options?: {
    truncated?: boolean;
    /** Pre-adjudication extract fingerprint; must not depend on model verdicts. */
    correlationHash?: string | null;
  }
): AdjudicateIocsResult => {
  const output = [...prepared.output];
  const reviewedIndexes = new Set(prepared.reviewable.map((candidate) => candidate.originalIndex));
  for (const candidate of prepared.reviewable) {
    // Truncated overflow values are prompt-only; approve/reject against the
    // original IOC stored at originalIndex.
    const original = prepared.output[candidate.originalIndex] ?? candidate.ioc;
    output[candidate.originalIndex] = approvedIds.has(candidate.id)
      ? { ...original, tier_basis: semanticIndicatorBasis(original.tier_basis) }
      : downgrade(
          original,
          candidate.degraded ? 'semantic_reference_degraded' : 'semantic_reference'
        );
  }

  // Deferred URL/domain candidates keep heuristic tiers in `iocs`, but stay out
  // of anchors / promotion until a model pass reviews them. Correlation hash is separate.
  for (let index = 0; index < output.length; index++) {
    const ioc = output[index];
    if (
      (ioc.type === 'url' || ioc.type === 'domain') &&
      PROMOTABLE_TIERS.has(ioc.tier) &&
      !reviewedIndexes.has(index)
    ) {
      output[index] = { ...ioc, deferred_unreviewed: true };
    }
  }

  // `context` is prompt-only (extract_iocs sets it for the model to judge
  // against); `extracted.iocs` is a dynamic: strict nested mapping that does
  // not declare it, so it must never reach the result persist_extractions writes.
  const strippedOutput = output.map(({ context, ...rest }) => rest);

  const anchorIocs = strippedOutput.filter((ioc, index) => {
    if (!PROMOTABLE_TIERS.has(ioc.tier)) return false;
    if ((ioc.type === 'url' || ioc.type === 'domain') && !reviewedIndexes.has(index)) {
      return false;
    }
    return true;
  });
  return {
    count: strippedOutput.length,
    iocs: strippedOutput,
    // Prefer the extract-time fingerprint. Fallback hashes prepared.output (pre-verdict).
    ioc_set_hash:
      options?.correlationHash !== undefined
        ? options.correlationHash
        : hashIocSet(prepared.output),
    anchor_iocs: anchorIocs,
    promotable_count: anchorIocs.length,
    ...(options?.truncated ? { truncated: true as const } : {}),
    adjudication: {
      provider: 'semantic_model',
      reviewed: prepared.reviewable.length,
      approved: prepared.reviewable.filter((candidate) => approvedIds.has(candidate.id)).length,
      downgraded: prepared.reviewable.filter((candidate) => !approvedIds.has(candidate.id)).length,
      deterministic_references: prepared.deterministicReferences,
      deferred_unreviewed: prepared.deferredUnreviewed,
    },
  };
};
