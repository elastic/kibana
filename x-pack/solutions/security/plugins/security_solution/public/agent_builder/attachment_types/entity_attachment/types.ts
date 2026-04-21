/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { EntityType } from '../../../../common/entity_analytics/types';

/**
 * Raw identifier pair as emitted by the Security UI / skill and validated by
 * the server-side Zod schema.
 */
export interface EntityAttachmentIdentifier {
  identifierType: EntityType | 'host' | 'user' | 'service' | 'generic';
  identifier: string;
}

/**
 * Legacy single-entity payload shape.
 */
export interface EntityAttachmentSingleData extends EntityAttachmentIdentifier {
  attachmentLabel?: string;
}

/**
 * Multi-entity payload shape.
 */
export interface EntityAttachmentMultiData {
  entities: EntityAttachmentIdentifier[];
  attachmentLabel?: string;
}

/**
 * Discriminated payload type - either the legacy single shape or the list shape.
 */
export type EntityAttachmentData = EntityAttachmentSingleData | EntityAttachmentMultiData;

/**
 * A typed Agent Builder attachment with entity payload.
 */
export type EntityAttachment = Attachment<string, EntityAttachmentData>;

/**
 * Normalised shape used throughout the renderer - always a non-empty list of
 * identifiers plus an `isSingle` flag so the dispatcher can pick a card vs table.
 */
export interface NormalisedEntityAttachment {
  isSingle: boolean;
  attachmentLabel?: string;
  entities: EntityAttachmentIdentifier[];
}
