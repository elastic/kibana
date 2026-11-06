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

/** Ellipsis truncation for text-bearing cell content (`EuiText` / `EuiLink`). */
export const truncatedCellCss = css`
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** Sizes a container to the cell width so a truncated child can ellipsize (tooltip anchor, flex group). */
export const truncatedContainerCss = css`
  width: 100%;
  min-width: 0;
`;

/** Allows an `EuiFlexItem` to shrink below its content width so a child can ellipsize. */
export const truncatedFlexItemCss = css`
  min-width: 0;
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
