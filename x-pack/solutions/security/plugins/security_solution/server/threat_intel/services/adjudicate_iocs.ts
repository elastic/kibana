/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import { MAX_IOC_TIER_BASIS_LENGTH } from '../../../common/threat_intel/contracts/enrichment';
import type { ExtractedIoc, ExtractIocsResult, IocTier } from './extract_iocs';
import { refang } from './extract_iocs';

const SEMANTIC_INDICATOR_PREFIX = 'semantic_indicator:';

/** Prefix an approved candidate's basis without exceeding response schema bounds. */
const semanticIndicatorBasis = (basis: string): string =>
  `${SEMANTIC_INDICATOR_PREFIX}${basis}`.slice(0, MAX_IOC_TIER_BASIS_LENGTH);

/** Candidates per model call (matches approved_ioc_candidate_ids schema max). */
export const MAX_SEMANTIC_CANDIDATES_PER_BATCH = 300;
/** Hard cap on adjudication batches so IOC-rich reports cannot unbounded-call. */
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
const CONTEXT_CHARS = 240;
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

const sliceContext = (source: string, index: number, valueLength: number): string =>
  source
    .slice(
      Math.max(0, index - CONTEXT_CHARS),
      Math.min(source.length, index + valueLength + CONTEXT_CHARS)
    )
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Prefer an occurrence whose surrounding prose looks like attacker attribution
 * over a bare first hit (often a citation). When scores tie, keep the later
 * occurrence so mid/late campaign write-ups win over an early docs link.
 *
 * Cap scored occurrences per value and cache by value so a pathological article
 * with millions of repeats cannot multiply work across hundreds of candidates.
 */
const ATTRIBUTION_CONTEXT_CUE =
  /\b(attacker|adversary|c2|c&c|payload|malware|downloaded|beacon|exfiltrat|command.?and.?control|infrastructure|dropper|staged)\b/i;
const MAX_OCCURRENCES_TO_SCORE = 32;

interface ScoredOccurrence {
  source: string;
  index: number;
  score: number;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive host, case-sensitive path/query/hash (URL paths are distinct IOCs). */
const isUrlBoundary = (char: string | undefined): boolean =>
  char === undefined || /[\s"'<>)\]},.;]/.test(char);

const scoreUrlOccurrences = (source: string, urlValue: string): ScoredOccurrence[] => {
  const scored: ScoredOccurrence[] = [];
  try {
    const parsed = new URL(urlValue);
    const pathPart = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    // Match protocol+host case-insensitively, then require an exact path/query/hash
    // so `/PAYLOAD` and `/payload` never share review context.
    const hostPattern = new RegExp(
      `${escapeRegExp(parsed.protocol)}//${escapeRegExp(parsed.host)}`,
      'gi'
    );
    let hostMatch: RegExpExecArray | null;
    while (
      scored.length < MAX_OCCURRENCES_TO_SCORE &&
      (hostMatch = hostPattern.exec(source)) !== null
    ) {
      const hostEnd = hostMatch.index + hostMatch[0].length;
      const after = hostEnd + pathPart.length;
      if (source.slice(hostEnd, after) === pathPart && isUrlBoundary(source[after])) {
        const index = hostMatch.index;
        const window = source.slice(
          Math.max(0, index - CONTEXT_CHARS),
          Math.min(source.length, after + CONTEXT_CHARS)
        );
        scored.push({
          source,
          index,
          score: (ATTRIBUTION_CONTEXT_CUE.test(window) ? 1_000_000 : 0) + index,
        });
      }
    }
  } catch {
    // Fall through to exact search below when URL parsing fails.
  }
  if (scored.length === 0) {
    let from = 0;
    while (from < source.length && scored.length < MAX_OCCURRENCES_TO_SCORE) {
      const index = source.indexOf(urlValue, from);
      if (index < 0) break;
      const window = source.slice(
        Math.max(0, index - CONTEXT_CHARS),
        Math.min(source.length, index + urlValue.length + CONTEXT_CHARS)
      );
      scored.push({
        source,
        index,
        score: (ATTRIBUTION_CONTEXT_CUE.test(window) ? 1_000_000 : 0) + index,
      });
      from = index + Math.max(urlValue.length, 1);
    }
  }
  return scored;
};

const scoreOccurrences = (
  source: string,
  lowerSource: string,
  lowerValue: string
): ScoredOccurrence[] => {
  const scored: ScoredOccurrence[] = [];
  let from = 0;
  while (from < lowerSource.length && scored.length < MAX_OCCURRENCES_TO_SCORE) {
    const index = lowerSource.indexOf(lowerValue, from);
    if (index < 0) break;
    const window = source.slice(
      Math.max(0, index - CONTEXT_CHARS),
      Math.min(source.length, index + lowerValue.length + CONTEXT_CHARS)
    );
    scored.push({
      source,
      index,
      score: (ATTRIBUTION_CONTEXT_CUE.test(window) ? 1_000_000 : 0) + index,
    });
    from = index + Math.max(lowerValue.length, 1);
  }
  return scored;
};

/**
 * Pick review context from the best-scoring occurrence across both the original
 * article and its refanged copy. Canonical citations and later defanged attacker
 * mentions must compete in one pass so we do not lock onto the first spelling.
 */
const contextFor = (
  originalText: string,
  lowerOriginal: string,
  refangedText: string,
  lowerRefanged: string,
  value: string,
  iocType: ExtractedIoc['type'],
  cache: Map<string, string>
): string => {
  // URLs cache on the exact value so `/PAYLOAD` and `/payload` stay distinct.
  // Domains stay case-insensitive.
  const cacheKey = iocType === 'url' ? value : value.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const scored =
    iocType === 'url'
      ? [...scoreUrlOccurrences(originalText, value), ...scoreUrlOccurrences(refangedText, value)]
      : [
          ...scoreOccurrences(originalText, lowerOriginal, cacheKey),
          ...scoreOccurrences(refangedText, lowerRefanged, cacheKey),
        ];
  const best = scored.reduce<ScoredOccurrence | undefined>((winner, candidate) => {
    if (!winner || candidate.score > winner.score) return candidate;
    if (candidate.score === winner.score && candidate.index > winner.index) return candidate;
    return winner;
  }, undefined);

  const context = best === undefined ? '' : sliceContext(best.source, best.index, value.length);
  cache.set(cacheKey, context);
  return context;
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
  params: Pick<AdjudicateIocsParams, 'text' | 'iocs' | 'article_url'>
): PreparedIocAdjudication => {
  const output = [...params.iocs];
  const lowerOriginal = params.text.toLowerCase();
  const refangedText = refang(params.text);
  const lowerRefanged = refangedText.toLowerCase();
  const contextCache = new Map<string, string>();
  let deterministicReferences = 0;

  const candidates = params.iocs
    .map((ioc, originalIndex) => ({ ioc, originalIndex }))
    .filter(({ ioc }) => isSemanticCandidate(ioc))
    .filter(({ ioc, originalIndex }) => {
      // Same-origin article links are citations. Markdown link destinations are
      // not: rendered pages also use `[label](url)` for payload URLs, so leave those for
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

  // Apply the call budget before context search: scanning millions of characters
  // for every extracted URL/domain would stall the server on IOC-rich reports.
  const capacity = MAX_SEMANTIC_CANDIDATES_PER_BATCH * MAX_SEMANTIC_REVIEW_BATCHES;
  const deferredCount = Math.max(0, candidates.length - capacity);
  const inBudget = candidates.slice(0, capacity);

  const reviewable = inBudget.map((candidate) => ({
    ...candidate,
    id: candidate.originalIndex,
    context: contextFor(
      params.text,
      lowerOriginal,
      refangedText,
      lowerRefanged,
      candidate.ioc.value,
      candidate.ioc.type,
      contextCache
    ),
  }));

  const { batches } = chunkIocAdjudicationBatches(reviewable);
  // Deferred candidates keep their heuristic tier. They are not a negative
  // model verdict, just past the batch budget for this enrichment run.

  return {
    output,
    reviewable: batches.flat(),
    deterministicReferences,
    deferredUnreviewed: deferredCount,
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
  if (value.length >= maxChars) return context.slice(index, index + maxChars);
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
      : downgrade(original, 'semantic_reference');
  }

  // Deferred URL/domain candidates keep heuristic tiers in `iocs`, but stay out
  // of anchors until a model pass reviews them. Correlation hash is separate.
  const anchorIocs = output.filter((ioc, index) => {
    if (!PROMOTABLE_TIERS.has(ioc.tier)) return false;
    if ((ioc.type === 'url' || ioc.type === 'domain') && !reviewedIndexes.has(index)) {
      return false;
    }
    return true;
  });
  return {
    count: output.length,
    iocs: output,
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
