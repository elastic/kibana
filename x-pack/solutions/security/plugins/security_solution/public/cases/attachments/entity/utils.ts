/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ENTITY_ATTACHMENT_TYPE, type CaseUI } from '@kbn/cases-plugin/common';
import type {
  EntityAttachmentMetadata,
  EntityAttachmentPayload,
} from '../../../../common/cases/attachments/entity';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { EntitiesTableConfig } from '../../../entity_analytics/components/home/entities_table';

export type CaseAttachment = CaseUI['comments'][number];

/** Pairs `attachmentId` with `entityType` to drive per-type field matching in `CANDIDATE_FIELDS_BY_TYPE`. */
export interface AttachedEntity {
  attachmentId: string;
  entityType: EntityAttachmentMetadata['entityType'];
}

/** Narrows to a `security.entity` attachment, rejecting alert attachments (array ids) and missing metadata. */
export const isEntityAttachment = (
  comment: CaseAttachment
): comment is CaseAttachment & EntityAttachmentPayload => {
  // Cast to a loose shape so we can access fields that only exist on some union members.
  const candidate = comment as {
    type?: string;
    attachmentId?: string | string[]; // alerts batch as string[], entities are always string
    metadata?: object | null;
  };
  return (
    candidate.type === SECURITY_ENTITY_ATTACHMENT_TYPE &&
    typeof candidate.attachmentId === 'string' &&
    candidate.metadata != null
  );
};

/** Case-insensitive match against an entity's name, type, and risk level. */
export const matchesSearchTerm = (metadata: EntityAttachmentMetadata, searchTerm: string) => {
  const searchableText = `${metadata.entityName} ${metadata.entityType} ${
    metadata.riskLevel ?? ''
  }`.toLowerCase();
  return searchableText.includes(searchTerm.toLowerCase());
};

/**
 * Which ECS fields to search when looking up an attached entity in the entity store.
 *
 * This exists because the attachment payload stores a raw identifier string (e.g. "alice",
 * "alice@corp.com") but not which ECS field it came from. Without that, the only way to find
 * the entity in the store is to OR across all fields that could plausibly hold that value.
 *
 * TODO: this constant (and the OR query in EntityTabTable) can be removed if the attachment
 * payload is updated to store either the source field name or the canonical entity.id (EUID).
 * `entity.id` is already included here as a forward-looking fallback for when that happens.
 *
 * This is a curated subset — disambiguation-only fields (e.g. `host.id` in local-namespace
 * user EUIDs, `user.domain` in domain-qualified fallbacks) are excluded to avoid false matches
 * across entity types. It cannot be derived automatically yet because the entity_store plugin
 * does not expose a `getPrimaryIdentifierFields` function from its public API. If a new
 * top-level identity field is added to the entity store, update this list to match:
 *   user: x-pack/solutions/security/plugins/entity_store/common/domain/definitions/user.ts
 *   host: x-pack/solutions/security/plugins/entity_store/common/domain/definitions/host.ts
 */
export const CANDIDATE_FIELDS_BY_TYPE: Record<EntityType, readonly string[]> = {
  user: ['user.name', 'user.email', 'user.id', 'entity.id'],
  host: ['host.name', 'host.hostname', 'host.id', 'entity.id'],
  service: ['service.name', 'entity.id'],
  generic: ['entity.id'],
};

/** Isolated table config so localStorage keys and flyout scope don't collide with the EA home page. */
export const CASE_ATTACHMENT_TABLE_CONFIG: EntitiesTableConfig = {
  tableId: 'entity-analytics-case-attachment-table',
  columnsLocalStorageKey: 'securitySolution.entityAnalytics.cases.attachment.columns',
  columnsSettingsLocalStorageKey:
    'securitySolution.entityAnalytics.cases.attachment.columns:settings',
  groupingLocalStorageKey: 'securitySolution.entityAnalytics.cases.attachment.grouping',
};
