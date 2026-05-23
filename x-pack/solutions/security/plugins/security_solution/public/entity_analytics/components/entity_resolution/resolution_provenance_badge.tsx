/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import {
  getResolvedBy,
  getResolutionScore,
  getResolutionModelId,
  getByRuleVerdict,
  getByEmbeddingVerdict,
  isDivergent,
  type ResolutionProvenanceSource,
} from './helpers';
import {
  RESOLVED_BY_RULE_LABEL,
  RESOLVED_BY_CSV_LABEL,
  RESOLVED_BY_MANUAL_LABEL,
  RESOLVED_BY_EMBEDDING_LABEL_NO_SCORE,
  RESOLVED_BY_EMBEDDING_RERANK_LABEL_NO_SCORE,
  RESOLVED_BY_EMBEDDING_LLM_LABEL_NO_SCORE,
  RESOLUTION_DIVERGENT_LABEL,
  resolvedByEmbeddingLabel,
  resolvedByEmbeddingRerankLabel,
  resolvedByEmbeddingLlmLabel,
  resolvedByTooltipWithModel,
  resolvedByTooltipScoreOnly,
  resolutionDivergenceTooltip,
} from './translations';
import {
  RESOLUTION_PROVENANCE_BADGE_TEST_ID,
  RESOLUTION_DIVERGENCE_BADGE_TEST_ID,
} from './test_ids';

interface ResolutionProvenanceBadgeProps {
  entity: Record<string, unknown>;
}

const isEmbeddingSource = (source: ResolutionProvenanceSource): boolean =>
  source === 'embedding' || source === 'embedding+rerank' || source === 'embedding+llm';

/**
 * Format a unit-interval score (e.g. 0.913) as an integer percent (91).
 * Clamped to [0, 100] to defend against drift / rerank scores outside the
 * typical cosine range.
 */
const toPercent = (score: number): number => {
  const clamped = Math.max(0, Math.min(1, score));
  return Math.round(clamped * 100);
};

const formatLabel = (source: ResolutionProvenanceSource, score: number | undefined): string => {
  switch (source) {
    case 'rule':
      return RESOLVED_BY_RULE_LABEL;
    case 'csv':
      return RESOLVED_BY_CSV_LABEL;
    case 'manual':
      return RESOLVED_BY_MANUAL_LABEL;
    case 'embedding':
      return score !== undefined
        ? resolvedByEmbeddingLabel(toPercent(score))
        : RESOLVED_BY_EMBEDDING_LABEL_NO_SCORE;
    case 'embedding+rerank':
      return score !== undefined
        ? resolvedByEmbeddingRerankLabel(toPercent(score))
        : RESOLVED_BY_EMBEDDING_RERANK_LABEL_NO_SCORE;
    case 'embedding+llm':
      return score !== undefined
        ? resolvedByEmbeddingLlmLabel(toPercent(score))
        : RESOLVED_BY_EMBEDDING_LLM_LABEL_NO_SCORE;
    default:
      // Unknown future source value (e.g. FE bundle older than BE that started
      // writing a new tag) — render the raw string so SOC analysts at least
      // see *something* attributed instead of a silently-empty cell.
      return source;
  }
};

const formatTooltipContent = (
  score: number | undefined,
  modelId: string | undefined
): string | undefined => {
  if (score === undefined && !modelId) {
    return undefined;
  }
  // 3 decimal places matches the design §10 example "0.913".
  const scoreStr = score !== undefined ? score.toFixed(3) : '';
  if (modelId && score !== undefined) {
    return resolvedByTooltipWithModel({ model: modelId, score: scoreStr });
  }
  if (modelId) {
    return resolvedByTooltipWithModel({ model: modelId, score: '' });
  }
  return resolvedByTooltipScoreOnly(scoreStr);
};

/**
 * Renders a per-alias provenance badge for the resolution-group table.
 * - `rule` / `csv` / `manual` → hollow badge.
 * - `embedding*` variants → accent badge with the rounded percent score.
 *
 * Returns `null` when the entity has no `resolved_by` field — typically the
 * target entity (which is itself the link target, not an alias) and any
 * legacy alias docs from before the provenance migration.
 */
export const ResolutionProvenanceBadge: React.FC<ResolutionProvenanceBadgeProps> = ({ entity }) => {
  const source = getResolvedBy(entity);
  if (!source) return null;

  // Parallel-resolution divergence (RFC: er-v2-parallel-resolution-rfc.md).
  // When the server merge marks the alias as divergent, surface a single
  // warning-coloured badge instead of the per-source "Linked by" attribution
  // — the analyst needs to see "rule and embedding disagree" first; the
  // tooltip carries the full breakdown.
  if (isDivergent(entity)) {
    const ruleVerdict = getByRuleVerdict(entity);
    const embeddingVerdict = getByEmbeddingVerdict(entity);
    const tooltipContent = resolutionDivergenceTooltip({
      ruleTarget: ruleVerdict?.resolvedTo,
      embeddingTarget: embeddingVerdict?.resolvedTo,
      embeddingPercent:
        embeddingVerdict?.score !== undefined
          ? String(toPercent(embeddingVerdict.score))
          : undefined,
    });
    return (
      <EuiToolTip content={tooltipContent}>
        <EuiBadge color="warning" data-test-subj={RESOLUTION_DIVERGENCE_BADGE_TEST_ID}>
          {RESOLUTION_DIVERGENT_LABEL}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  const score = getResolutionScore(entity);
  const modelId = getResolutionModelId(entity);

  const color = isEmbeddingSource(source) ? 'accent' : 'hollow';
  const label = formatLabel(source, score);
  const tooltip = formatTooltipContent(score, modelId);

  const badge = (
    <EuiBadge color={color} data-test-subj={RESOLUTION_PROVENANCE_BADGE_TEST_ID}>
      {label}
    </EuiBadge>
  );

  if (!tooltip) {
    return badge;
  }

  return <EuiToolTip content={tooltip}>{badge}</EuiToolTip>;
};
