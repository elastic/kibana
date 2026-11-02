/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityAttachment,
  EntityAttachmentIdentifier,
  EntityAttachmentRiskStats,
  NormalisedEntityAttachment,
} from './types';

const ALLOWED_TYPES = new Set(['host', 'user', 'service', 'generic']);

const isValidIdentifier = (candidate: unknown): candidate is EntityAttachmentIdentifier => {
  if (!candidate || typeof candidate !== 'object') return false;
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.identifierType === 'string' &&
    ALLOWED_TYPES.has(record.identifierType) &&
    typeof record.identifier === 'string' &&
    record.identifier.length > 0
  );
};

const pickEntityStoreId = (candidate: unknown): string | undefined => {
  if (!candidate || typeof candidate !== 'object') return undefined;
  const raw = (candidate as Record<string, unknown>).entityStoreId;
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
};

/**
 * Light structural check for the handful of fields `RiskSummaryMini`
 * actually reads. We keep this deliberately permissive (optional fields can
 * be missing, unknown extras are tolerated) because old attachments won't
 * carry this shape at all — we just want to reject garbage payloads that
 * would make the card throw when rendering the contributions table.
 */
const isValidRiskStats = (candidate: unknown): candidate is EntityAttachmentRiskStats => {
  if (!candidate || typeof candidate !== 'object') return false;
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.calculated_level === 'string' &&
    typeof record.calculated_score === 'number' &&
    typeof record.calculated_score_norm === 'number' &&
    typeof record.category_1_score === 'number' &&
    typeof record.category_1_count === 'number'
  );
};

/**
 * Accept either a single-entity payload (legacy `{ identifierType, identifier }`)
 * or a multi-entity payload (`{ entities: [...] }`) and normalise to a common
 * shape. Returns `null` if the payload is unusable so callers can render an
 * empty/error state instead of crashing the chat round.
 *
 * Optional `riskStats` and `resolutionRiskStats` from single-entity payloads
 * are forwarded to the normalised shape when they pass `isValidRiskStats`.
 * Missing or malformed stats are silently dropped so older attachments and
 * forward-compatible variations continue to render.
 */
export const normaliseEntityAttachment = (
  attachment: EntityAttachment
): NormalisedEntityAttachment | null => {
  const data = attachment?.data;
  if (!data || typeof data !== 'object') {
    return null;
  }

  const attachmentLabel = (data as { attachmentLabel?: string }).attachmentLabel;

  if ('entities' in data && Array.isArray((data as { entities: unknown[] }).entities)) {
    const rawEntities = (data as { entities: unknown[] }).entities;
    const entities: EntityAttachmentIdentifier[] = rawEntities
      .filter(isValidIdentifier)
      .map((candidate) => {
        const entityStoreId = pickEntityStoreId(candidate);
        return {
          identifierType: candidate.identifierType,
          identifier: candidate.identifier,
          ...(entityStoreId ? { entityStoreId } : {}),
        };
      });
    if (entities.length === 0) {
      return null;
    }
    return {
      isSingle: entities.length === 1,
      attachmentLabel,
      entities,
    };
  }

  if (isValidIdentifier(data)) {
    const rawRiskStats = (data as { riskStats?: unknown }).riskStats;
    const rawResolutionRiskStats = (data as { resolutionRiskStats?: unknown }).resolutionRiskStats;
    const entityStoreId = pickEntityStoreId(data);
    return {
      isSingle: true,
      attachmentLabel,
      entities: [
        {
          identifierType: data.identifierType,
          identifier: data.identifier,
          ...(entityStoreId ? { entityStoreId } : {}),
        },
      ],
      ...(isValidRiskStats(rawRiskStats) ? { riskStats: rawRiskStats } : {}),
      ...(isValidRiskStats(rawResolutionRiskStats)
        ? { resolutionRiskStats: rawResolutionRiskStats }
        : {}),
    };
  }

  return null;
};
