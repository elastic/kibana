/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import type { ExtractedIoc, ExtractIocsResult, IocTier } from './extract_iocs';
import { logStageUsage } from '../lib/cost_tracker';

const MAX_SEMANTIC_CANDIDATES = 300;
const MAX_IOC_CANDIDATE_ID = 4_999;
const CONTEXT_CHARS = 240;
const PROMOTABLE_TIERS: ReadonlySet<IocTier> = new Set([
  'discriminating',
  'contextual',
  'uncertain',
]);

export const iocAdjudicationModelOutputSchema = z.object({
  indicator_ids: z
    .array(z.number().int().min(0).max(MAX_IOC_CANDIDATE_ID))
    .max(MAX_SEMANTIC_CANDIDATES),
});

export type IocAdjudicationModelOutput = z.infer<typeof iocAdjudicationModelOutputSchema>;

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

const contextFor = (text: string, value: string): string => {
  const index = text.toLowerCase().indexOf(value.toLowerCase());
  if (index < 0) return '';
  return text
    .slice(
      Math.max(0, index - CONTEXT_CHARS),
      Math.min(text.length, index + value.length + CONTEXT_CHARS)
    )
    .replace(/\s+/g, ' ')
    .trim();
};

const isMarkdownLinkDestination = (text: string, value: string): boolean => {
  const lowerText = text.toLowerCase();
  const lowerValue = value.toLowerCase();
  let from = 0;
  while (from < lowerText.length) {
    const index = lowerText.indexOf(lowerValue, from);
    if (index < 0) return false;
    const prefix = lowerText.slice(Math.max(0, index - 3), index);
    if (prefix.endsWith('](') || prefix.endsWith('](<')) return true;
    from = index + lowerValue.length;
  }
  return false;
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

const buildPrompt = (
  candidates: IocAdjudicationCandidate[],
  params: Pick<AdjudicateIocsParams, 'title' | 'article_url'>
): string => `You are a precision-first threat-intelligence IOC adjudicator.

Select only candidate URLs or domains that the surrounding report text explicitly attributes to
attacker-controlled or malicious infrastructure. Return their numeric ids. When in doubt, leave a
candidate out.

Never select:
- reporting-vendor, documentation, advisory, ATT&CK, CVE, product, or tool links;
- navigation, image, social/share, tracking, login, or marketing URLs;
- a legitimate platform or CDN host without a specific attacker-controlled resource;
- a researcher's PoC, detection rule, or repository cited by the article;
- example, private, or placeholder infrastructure.

A specific path is not sufficient by itself: the context must say that the attacker controlled or
used that resource. Defanging and code formatting are attention cues, not proof.

Report title: ${params.title ?? ''}
Report URL: ${params.article_url ?? ''}

Candidates:
${JSON.stringify(
  candidates.map(({ id, ioc, context }) => ({
    id,
    type: ioc.type,
    value: ioc.value,
    current_tier: ioc.tier,
    current_basis: ioc.tier_basis,
    context,
  }))
)}`;

export const prepareIocAdjudication = (
  params: Pick<AdjudicateIocsParams, 'text' | 'iocs' | 'article_url'>
): PreparedIocAdjudication => {
  const output = [...params.iocs];
  let deterministicReferences = 0;

  const candidates = params.iocs
    .map((ioc, originalIndex) => ({ ioc, originalIndex }))
    .filter(({ ioc }) => isSemanticCandidate(ioc))
    .filter(({ ioc, originalIndex }) => {
      if (
        isSameOrigin(ioc, params.article_url) ||
        (ioc.type === 'url' &&
          ioc.tier !== 'discriminating' &&
          isMarkdownLinkDestination(params.text, ioc.value))
      ) {
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
    context: contextFor(params.text, candidate.ioc.value),
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

export const reconcileIocAdjudication = (
  prepared: PreparedIocAdjudication,
  approvedIds: ReadonlySet<number>,
  truncated?: boolean
): AdjudicateIocsResult => {
  const output = [...prepared.output];
  for (const candidate of prepared.reviewable) {
    output[candidate.originalIndex] = approvedIds.has(candidate.id)
      ? { ...candidate.ioc, tier_basis: `semantic_indicator:${candidate.ioc.tier_basis}` }
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

export const adjudicateIocs = async (
  model: ScopedModel,
  logger: Logger,
  params: AdjudicateIocsParams
): Promise<AdjudicateIocsResult> => {
  const prepared = prepareIocAdjudication(params);

  let approvedIds = new Set<number>();
  if (prepared.reviewable.length > 0) {
    const structured = model.chatModel.withStructuredOutput(iocAdjudicationModelOutputSchema, {
      includeRaw: true,
    });
    const result = (await structured.invoke(buildPrompt(prepared.reviewable, params))) as {
      raw: { response_metadata: Record<string, unknown> };
      parsed: IocAdjudicationModelOutput;
    };
    logStageUsage(
      logger,
      'adjudicate_iocs',
      model.connector.connectorId,
      result.raw.response_metadata ?? {}
    );
    approvedIds = new Set(
      result.parsed.indicator_ids.filter((id) =>
        prepared.reviewable.some((candidate) => candidate.id === id)
      )
    );
  }

  const adjudicated = reconcileIocAdjudication(prepared, approvedIds, params.truncated);
  logger.debug(
    `adjudicate_iocs reviewed=${adjudicated.adjudication.reviewed} ` +
      `approved=${adjudicated.adjudication.approved} ` +
      `downgraded=${adjudicated.adjudication.downgraded} ` +
      `deterministic_references=${adjudicated.adjudication.deterministic_references} ` +
      `overflow_references=${adjudicated.adjudication.overflow_references}`
  );

  return adjudicated;
};
