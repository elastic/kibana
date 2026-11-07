/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntelligenceEntity } from '../common';
import type { EntityColumnId, EntityRow, EvidenceKind, EvidenceStatus } from './types';

/** Keys name-based evidence by entity kind as well as its normalized identifier. */
export const entityEvidenceKey = (type: string, identifier: string): string =>
  `${type}:${identifier.trim().toLowerCase()}`;

/** Finds identifiers that cannot resolve to one canonical entity in this inventory. */
export const ambiguousEntityKeys = (
  entities: readonly IntelligenceEntity[],
  typed = true
): Set<string> => {
  const idsByKey = new Map<string, Set<string>>();
  for (const entity of entities) {
    const key = typed
      ? entityEvidenceKey(entity.type, entity.identifierValue)
      : entity.identifierValue.trim().toLowerCase();
    const ids = idsByKey.get(key) ?? new Set<string>();
    ids.add(entity.id);
    idsByKey.set(key, ids);
  }
  return new Set([...idsByKey].filter(([, ids]) => ids.size > 1).map(([key]) => key));
};

/** Resolves evidence availability without mistaking incomplete or ambiguous data for zero. */
export const evidenceStatus = ({
  unavailable,
  ambiguous = false,
  partial = false,
}: {
  unavailable: boolean;
  ambiguous?: boolean;
  partial?: boolean;
}): EvidenceStatus => {
  if (unavailable) return 'unavailable';
  if (ambiguous) return 'ambiguous';
  return partial ? 'partial' : 'available';
};

/** Legacy rows without status metadata remain compatible with the table model. */
export const hasEvidence = (row: EntityRow, kind: EvidenceKind): boolean =>
  (row.evidence?.[kind] ?? 'available') === 'available';

/** Identifies the evidence source needed to render or sort a column. */
export const evidenceKindForColumn = (column: EntityColumnId): EvidenceKind | undefined => {
  if (column === 'rules' || column === 'lastAlert') return 'alerts';
  if (column === 'anoms') return 'anomalies';
  if (
    column === 'alerts' ||
    column === 'cases' ||
    column === 'attacks' ||
    column === 'watchlists'
  ) {
    return column;
  }
  return undefined;
};

/** Only infers uncased counts when complete evidence proves no alerts are attached. */
export const knownUncasedCount = (
  alertCount: number,
  caseCount: number,
  alertsStatus: EvidenceStatus,
  casesStatus: EvidenceStatus
): number | undefined => {
  if (alertsStatus !== 'available') return undefined;
  if (alertCount === 0) return 0;
  if (casesStatus === 'available' && caseCount === 0) return alertCount;
  return undefined;
};

/** Absence in a bounded sample cannot establish the absence of evidence for an entity. */
export const sampledEvidenceStatus = ({
  unavailable,
  isLimited,
  isPresent,
}: {
  unavailable: boolean;
  isLimited: boolean;
  isPresent: boolean;
}): EvidenceStatus => evidenceStatus({ unavailable, partial: isLimited && !isPresent });
