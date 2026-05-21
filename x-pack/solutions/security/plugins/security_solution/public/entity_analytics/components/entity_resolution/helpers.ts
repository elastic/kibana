/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

/**
 * Safely extract a nested field value from a flat-keyed entity record.
 * Entity Store documents use dot-notation keys like 'entity.name'.
 */
export const getEntityField = (entity: Record<string, unknown>, field: string): unknown => {
  // Try direct access first (common case for flat-keyed docs)
  if (field in entity) {
    return entity[field];
  }

  // Walk nested path
  const parts = field.split('.');
  let current: unknown = entity;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

export const getEntityName = (entity: Record<string, unknown>): string => {
  return String(getEntityField(entity, 'entity.name') ?? '');
};

export const getEntityId = (entity: Record<string, unknown>): string => {
  return String(getEntityField(entity, 'entity.id') ?? '');
};

export const getEntitySource = (entity: Record<string, unknown>): string => {
  return String(getEntityField(entity, 'entity.source') ?? '');
};

export const getEntityRiskScore = (entity: Record<string, unknown>): number | undefined => {
  const score = getEntityField(entity, 'entity.risk.calculated_score_norm');
  return typeof score === 'number' ? score : undefined;
};

/** Row data type for the resolution group table. Defined here to avoid ESLint false positives. */
export interface TableEntityRow {
  entity: Record<string, unknown>;
}

export const truncatedCellCss = css`
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const getEntityLastSeen = (entity: Record<string, unknown>): string | undefined => {
  const value = getEntityField(entity, 'entity.lifecycle.last_seen');
  return typeof value === 'string' ? value : undefined;
};

export const getResolutionRiskScore = (entity: Record<string, unknown>): number | undefined => {
  const score = getEntityField(
    entity,
    'entity.relationships.resolution.risk.calculated_score_norm'
  );
  return typeof score === 'number' ? score : undefined;
};

/**
 * Closed-enum mirror of the server-side `ResolutionProvenanceSource` in
 * `entity_store/server/domain/resolution/resolution_client.ts`. Re-declared
 * here to avoid pulling a server module into a public bundle.
 *
 * Compound values (`embedding+rerank`, `embedding+llm`) are reserved for
 * Phase 4. The badge falls back gracefully on any unknown string so a future
 * source value won't crash the flyout if the FE bundle is older than the BE.
 */
export type ResolutionProvenanceSource =
  | 'rule'
  | 'embedding'
  | 'csv'
  | 'manual'
  | 'embedding+rerank'
  | 'embedding+llm';

export const getResolvedBy = (
  entity: Record<string, unknown>
): ResolutionProvenanceSource | undefined => {
  const value = getEntityField(entity, 'entity.relationships.resolution.resolved_by');
  return typeof value === 'string' ? (value as ResolutionProvenanceSource) : undefined;
};

export const getResolutionScore = (entity: Record<string, unknown>): number | undefined => {
  const value = getEntityField(entity, 'entity.relationships.resolution.score');
  return typeof value === 'number' ? value : undefined;
};

export const getResolutionModelId = (entity: Record<string, unknown>): string | undefined => {
  const value = getEntityField(entity, 'entity.relationships.resolution.model_id');
  return typeof value === 'string' && value !== '' ? value : undefined;
};

/**
 * Per-source verdict on a single alias under the parallel-resolution model
 * (RFC: er-v2-parallel-resolution-rfc.md). Mirrors the server's
 * `entity.relationships.resolution.by_<source>.*` slots.
 */
export interface PerSourceResolutionVerdict {
  resolvedTo: string;
  resolvedAt?: string;
  score?: number;
  modelId?: string;
}

const readVerdict = (
  entity: Record<string, unknown>,
  source: 'rule' | 'embedding' | 'manual'
): PerSourceResolutionVerdict | undefined => {
  const resolvedTo = getEntityField(
    entity,
    `entity.relationships.resolution.by_${source}.resolved_to`
  );
  if (typeof resolvedTo !== 'string' || resolvedTo === '') return undefined;

  const resolvedAt = getEntityField(
    entity,
    `entity.relationships.resolution.by_${source}.resolved_at`
  );
  const verdict: PerSourceResolutionVerdict = { resolvedTo };
  if (typeof resolvedAt === 'string') verdict.resolvedAt = resolvedAt;

  if (source === 'embedding') {
    const score = getEntityField(entity, 'entity.relationships.resolution.by_embedding.score');
    if (typeof score === 'number') verdict.score = score;
    const modelId = getEntityField(entity, 'entity.relationships.resolution.by_embedding.model_id');
    if (typeof modelId === 'string' && modelId !== '') verdict.modelId = modelId;
  }
  return verdict;
};

export const getByRuleVerdict = (
  entity: Record<string, unknown>
): PerSourceResolutionVerdict | undefined => readVerdict(entity, 'rule');

export const getByEmbeddingVerdict = (
  entity: Record<string, unknown>
): PerSourceResolutionVerdict | undefined => readVerdict(entity, 'embedding');

export const getByManualVerdict = (
  entity: Record<string, unknown>
): PerSourceResolutionVerdict | undefined => readVerdict(entity, 'manual');

export const getEffectiveTo = (entity: Record<string, unknown>): string | undefined => {
  const value = getEntityField(entity, 'entity.relationships.resolution.effective_to');
  return typeof value === 'string' && value !== '' ? value : undefined;
};

/**
 * `divergent: true` is set by the server's merge policy when at least two
 * `by_*` sources disagree on the target. Tolerant of missing field for
 * docs written by the legacy single-slot path.
 */
export const isDivergent = (entity: Record<string, unknown>): boolean => {
  const value = getEntityField(entity, 'entity.relationships.resolution.divergent');
  return value === true;
};
