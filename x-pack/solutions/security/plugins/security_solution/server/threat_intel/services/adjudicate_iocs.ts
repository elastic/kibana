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

const MAX_SEMANTIC_CANDIDATES = 300;
/** Cap for the overflow-retry prompt so candidate values alone cannot re-overflow. */
export const OVERFLOW_MAX_SEMANTIC_CANDIDATES = 50;
const CONTEXT_CHARS = 240;
const OVERFLOW_CONTEXT_CHARS = 120;
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
    overflow_references: number;
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
  overflowReferences: number;
}

const iocSetHash = (iocs: ExtractedIoc[]): string | null =>
  iocs.length === 0
    ? null
    : createHash('sha256')
        .update(
          iocs
            .map((ioc) => ioc.value.toLowerCase())
            .sort()
            .join('\n')
        )
        .digest('hex');

const sliceContext = (source: string, index: number, valueLength: number): string =>
  source
    .slice(
      Math.max(0, index - CONTEXT_CHARS),
      Math.min(source.length, index + valueLength + CONTEXT_CHARS)
    )
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Prefer the original article span. When the IOC was published defanged
 * (`hxxps://evil[.]example/...`), the canonical value only appears in the
 * refanged copy that extraction already uses — take context from there.
 */
const contextFor = (
  originalText: string,
  lowerOriginal: string,
  refangedText: string,
  lowerRefanged: string,
  value: string
): string => {
  const lowerValue = value.toLowerCase();
  const originalIndex = lowerOriginal.indexOf(lowerValue);
  if (originalIndex >= 0) return sliceContext(originalText, originalIndex, value.length);
  const refangedIndex = lowerRefanged.indexOf(lowerValue);
  if (refangedIndex >= 0) return sliceContext(refangedText, refangedIndex, value.length);
  return '';
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
  const articleHost = hostnameFor(articleUrl);
  if (!articleHost) return false;
  if (ioc.type === 'url') return hostnameFor(ioc.value) === articleHost;
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

export const prepareIocAdjudication = (
  params: Pick<AdjudicateIocsParams, 'text' | 'iocs' | 'article_url'>
): PreparedIocAdjudication => {
  const output = [...params.iocs];
  const lowerOriginal = params.text.toLowerCase();
  const refangedText = refang(params.text);
  const lowerRefanged = refangedText.toLowerCase();
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

  const reviewable = candidates.slice(0, MAX_SEMANTIC_CANDIDATES).map((candidate) => ({
    ...candidate,
    id: candidate.originalIndex,
    context: contextFor(
      params.text,
      lowerOriginal,
      refangedText,
      lowerRefanged,
      candidate.ioc.value
    ),
  }));
  const overflow = candidates.slice(MAX_SEMANTIC_CANDIDATES);
  for (const candidate of overflow) {
    output[candidate.originalIndex] = downgrade(
      candidate.ioc,
      'semantic_reference_unreviewed_overflow'
    );
  }

  return {
    output,
    reviewable,
    deterministicReferences,
    overflowReferences: overflow.length,
  };
};

/**
 * Shrink the candidate set and per-candidate context for a confirmed context
 * overflow retry. Candidates not sent are marked as unreviewed overflow so
 * reconcile cannot treat them as model rejections.
 */
export const boundIocAdjudicationForOverflow = (
  prepared: PreparedIocAdjudication
): PreparedIocAdjudication => {
  const kept = prepared.reviewable.slice(0, OVERFLOW_MAX_SEMANTIC_CANDIDATES).map((candidate) => ({
    ...candidate,
    context: candidate.context.slice(0, OVERFLOW_CONTEXT_CHARS),
  }));
  const skipped = prepared.reviewable.slice(OVERFLOW_MAX_SEMANTIC_CANDIDATES);
  if (skipped.length === 0) {
    return { ...prepared, reviewable: kept };
  }
  const output = [...prepared.output];
  for (const candidate of skipped) {
    output[candidate.originalIndex] = downgrade(
      candidate.ioc,
      'semantic_reference_unreviewed_overflow'
    );
  }
  return {
    output,
    reviewable: kept,
    deterministicReferences: prepared.deterministicReferences,
    overflowReferences: prepared.overflowReferences + skipped.length,
  };
};

export const reconcileIocAdjudication = (
  prepared: PreparedIocAdjudication,
  approvedIds: ReadonlySet<number>,
  truncated?: boolean
): AdjudicateIocsResult => {
  const output = [...prepared.output];
  for (const candidate of prepared.reviewable) {
    output[candidate.originalIndex] = approvedIds.has(candidate.id)
      ? { ...candidate.ioc, tier_basis: semanticIndicatorBasis(candidate.ioc.tier_basis) }
      : downgrade(candidate.ioc, 'semantic_reference');
  }

  const anchorIocs = output.filter((ioc) => PROMOTABLE_TIERS.has(ioc.tier));
  return {
    count: output.length,
    iocs: output,
    ioc_set_hash: iocSetHash(anchorIocs),
    anchor_iocs: anchorIocs,
    promotable_count: anchorIocs.length,
    ...(truncated ? { truncated: true as const } : {}),
    adjudication: {
      provider: 'semantic_model',
      reviewed: prepared.reviewable.length,
      approved: prepared.reviewable.filter((candidate) => approvedIds.has(candidate.id)).length,
      downgraded: prepared.reviewable.filter((candidate) => !approvedIds.has(candidate.id)).length,
      deterministic_references: prepared.deterministicReferences,
      overflow_references: prepared.overflowReferences,
    },
  };
};
