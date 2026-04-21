/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityAttachment,
  EntityAttachmentIdentifier,
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

/**
 * Accept either a single-entity payload (legacy `{ identifierType, identifier }`)
 * or a multi-entity payload (`{ entities: [...] }`) and normalise to a common
 * shape. Returns `null` if the payload is unusable so callers can render an
 * empty/error state instead of crashing the chat round.
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
    const entities = (data as { entities: unknown[] }).entities.filter(isValidIdentifier);
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
    return {
      isSingle: true,
      attachmentLabel,
      entities: [
        {
          identifierType: data.identifierType,
          identifier: data.identifier,
        },
      ],
    };
  }

  return null;
};
