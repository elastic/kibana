/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import type { EntityType } from '../../../../common/entity_analytics/types';

/**
 * Raw identifier pair as emitted by the Security UI / skill and validated by
 * the server-side Zod schema.
 */
export interface EntityAttachmentIdentifier {
  identifierType: EntityType | 'host' | 'user' | 'service' | 'generic';
  identifier: string;
  /**
   * Canonical `entity.id` from the entity store (e.g. `user:name@host@namespace`).
   * Optional — attachments created before this field was added won't have it,
   * and the client hook falls back to per-type identity-field filtering.
   * Prefer this for the entity store lookup: for local users the composite
   * `entity.name` / `entity.id` diverges from `user.name`, so only matching
   * on `entity.id` returns the stored record.
   */
  entityStoreId?: string;
}

/**
 * Risk-doc projection the server embeds on a single-entity attachment so
 * the chat card's risk summary table can render without running a Redux-
 * backed search-strategy call client-side. Mirrors the server-side
 * `EntityAttachmentRiskStats` (see `server/.../entity_attachment_utils.ts`).
 * We intentionally only Pick the fields the card actually needs to keep the
 * attachment payload compact — `inputs`, `related_entities`, and
 * `calculation_run_id` are stripped on the server.
 */
export type EntityAttachmentRiskStats = Pick<
  EntityRiskScoreRecord,
  | '@timestamp'
  | 'id_field'
  | 'id_value'
  | 'calculated_level'
  | 'calculated_score'
  | 'calculated_score_norm'
  | 'category_1_score'
  | 'category_1_count'
  | 'category_2_score'
  | 'category_2_count'
  | 'notes'
  | 'criticality_modifier'
  | 'criticality_level'
  | 'modifiers'
  | 'score_type'
>;

/**
 * Legacy single-entity payload shape.
 */
export interface EntityAttachmentSingleData extends EntityAttachmentIdentifier {
  attachmentLabel?: string;
  /**
   * Full risk breakdown for the entity, embedded by
   * `security.get_entity` so the chat card can match the flyout's
   * contributions table. Absent for old attachments — consumers must fall
   * back to the entity-store-derived `RiskStats` when missing.
   */
  riskStats?: EntityAttachmentRiskStats;
  /**
   * Full risk breakdown for the entity's resolution group. Only populated
   * when the entity participates in a multi-member resolution group.
   */
  resolutionRiskStats?: EntityAttachmentRiskStats;
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
 *
 * `riskStats` / `resolutionRiskStats` are only ever populated on the
 * single-entity path; the list-attachment path doesn't surface a risk
 * breakdown today.
 */
export interface NormalisedEntityAttachment {
  isSingle: boolean;
  attachmentLabel?: string;
  entities: EntityAttachmentIdentifier[];
  riskStats?: EntityAttachmentRiskStats;
  resolutionRiskStats?: EntityAttachmentRiskStats;
}

/**
 * Type guard for identifier types that have a Security expandable-flyout overview
 * (host / user / service). Used by both `entity_attachment_definition` (to decide
 * whether to expose the Canvas `Preview` action button) and the canvas-content
 * dispatcher (to decide between mounting the full flyout or falling back to an
 * `EntityCard`). Kept in `types.ts` so it's reachable synchronously without
 * dragging the canvas chunk into the definition bundle.
 */
export const isFlyoutCapableIdentifierType = (
  identifierType: string | undefined
): identifierType is 'host' | 'user' | 'service' =>
  identifierType === 'host' || identifierType === 'user' || identifierType === 'service';
