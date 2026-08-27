/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type { ConversationEntity } from '../schemas/components/investigation.gen';

// Source of truth: security_solution/common/constants.ts SecurityAgentBuilderAttachments.entity
const SECURITY_ENTITY_ATTACHMENT_TYPE = 'security.entity';

interface EntityIdentifier {
  identifierType: string;
  identifier: string;
  entityStoreId?: string;
}

const toConversationEntity = ({ identifierType, identifier, entityStoreId }: EntityIdentifier): ConversationEntity => ({
  id: entityStoreId ?? `${identifierType}:${identifier}`,
  name: identifier,
});

const isEntityIdentifier = (v: unknown): v is EntityIdentifier =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as EntityIdentifier).identifierType === 'string' &&
  typeof (v as EntityIdentifier).identifier === 'string';

/**
 * Extracts deduplicated ConversationEntity entries from conversation-level attachments.
 * Handles both single-entity and multi-entity security.entity payload shapes.
 * Malformed rows are silently dropped — a bad payload must never break the queue.
 */
export const extractConversationEntities = (attachments: VersionedAttachment[]): ConversationEntity[] => {
  const seen = new Set<string>();
  const result: ConversationEntity[] = [];

  for (const attachment of attachments) {
    if (attachment.type !== SECURITY_ENTITY_ATTACHMENT_TYPE) continue;

    const version = attachment.versions.find((v) => v.version === attachment.current_version);
    if (!version) continue;

    const data = version.data as Record<string, unknown>;
    if (typeof data !== 'object' || data === null) continue;

    const identifiers: EntityIdentifier[] = [];

    if (Array.isArray(data.entities)) {
      // multi-entity shape: { entities: [{ identifierType, identifier, entityStoreId? }] }
      for (const item of data.entities) {
        if (isEntityIdentifier(item)) identifiers.push(item);
      }
    } else if (isEntityIdentifier(data)) {
      // single-entity shape: { identifierType, identifier, entityStoreId? }
      identifiers.push(data);
    }

    for (const ident of identifiers) {
      const entity = toConversationEntity(ident);
      if (!seen.has(entity.id)) {
        seen.add(entity.id);
        result.push(entity);
      }
    }
  }

  return result;
};
