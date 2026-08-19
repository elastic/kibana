/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/logging';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { ensureAttachment } from './attachment_utils';
import {
  describeEntityRow,
  type EntityIdentity,
  type EntityIdentifierType,
} from './entity_resolution';

/**
 * Fields we keep from `EntityRiskScoreRecord` when embedding a risk doc on
 * an entity attachment. We drop the heavy `inputs`, `related_entities`, and
 * `calculation_run_id` fields because the chat card's `RiskSummaryMini` only
 * needs the score/category/modifier/criticality breakdown to render, and
 * those extra fields can be megabytes in size.
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
 * Optional enrichment bits the tool can layer onto an attachment descriptor
 * after running side queries (risk index, resolution group). Split out from
 * `EntityAttachmentDescriptor` so the pure row-to-identity extractor
 * (`describeEntityRow`) stays free of side-effectful fetches.
 */
export interface EntityAttachmentEnrichment {
  riskStats?: EntityAttachmentRiskStats;
  resolutionRiskStats?: EntityAttachmentRiskStats;
}

export interface EntityAttachmentDescriptor extends EntityIdentity {
  attachmentLabel: string;
  /**
   * Full risk breakdown (category scores/counts, modifiers, criticality)
   * embedded on the attachment so the chat card's risk summary table can
   * render without spinning up a Redux-backed search-strategy call on the
   * client. See `stripRiskRecordForAttachment` for the exact projection.
   */
  riskStats?: EntityAttachmentRiskStats;
  /**
   * Resolution-group risk breakdown (only populated when the entity is part
   * of a resolution group with more than one member). Feeds the "Resolution
   * group risk score" block in the chat card.
   */
  resolutionRiskStats?: EntityAttachmentRiskStats;
}

/**
 * Returns a minimal risk-doc projection suitable for embedding in an entity
 * attachment payload. Returns `undefined` when the record is missing so
 * callers can drop the field entirely instead of embedding `null`s.
 */
export const stripRiskRecordForAttachment = (
  record: EntityRiskScoreRecord | undefined
): EntityAttachmentRiskStats | undefined => {
  if (!record) {
    return undefined;
  }

  return {
    '@timestamp': record['@timestamp'],
    id_field: record.id_field,
    id_value: record.id_value,
    calculated_level: record.calculated_level,
    calculated_score: record.calculated_score,
    calculated_score_norm: record.calculated_score_norm,
    category_1_score: record.category_1_score,
    category_1_count: record.category_1_count,
    ...(record.category_2_score !== undefined ? { category_2_score: record.category_2_score } : {}),
    ...(record.category_2_count !== undefined ? { category_2_count: record.category_2_count } : {}),
    notes: record.notes,
    ...(record.criticality_modifier !== undefined
      ? { criticality_modifier: record.criticality_modifier }
      : {}),
    ...(record.criticality_level !== undefined
      ? { criticality_level: record.criticality_level }
      : {}),
    ...(record.modifiers !== undefined ? { modifiers: record.modifiers } : {}),
    ...(record.score_type !== undefined ? { score_type: record.score_type } : {}),
  };
};

/**
 * Layers the attachment-specific `attachmentLabel` and optional `enrichment`
 * (risk stats) onto an already-resolved {@link EntityIdentity}
 */
export const toAttachmentDescriptor = (
  identity: EntityIdentity,
  enrichment?: EntityAttachmentEnrichment
): EntityAttachmentDescriptor => ({
  ...identity,
  attachmentLabel: `${identity.identifierType}: ${identity.identifier}`,
  ...(enrichment?.riskStats ? { riskStats: enrichment.riskStats } : {}),
  ...(enrichment?.resolutionRiskStats
    ? { resolutionRiskStats: enrichment.resolutionRiskStats }
    : {}),
});

/**
 * Derives the attachment descriptor directly from a resolved entity row.
 * Returns `null` when the row does not yield a usable identity (e.g. missing
 * type) so the caller can skip the attachment side-effect. Thin combination of
 * `describeEntityRow` (identity) + {@link toAttachmentDescriptor} (attachment
 * extras) — used when the caller has a raw row but no identity in hand.
 */
export const describeAttachmentForRow = ({
  columns,
  row,
  enrichment,
}: {
  columns: Array<{ name: string }>;
  row: unknown[];
  enrichment?: EntityAttachmentEnrichment;
}): EntityAttachmentDescriptor | null => {
  const identity = describeEntityRow({ columns, row });
  return identity ? toAttachmentDescriptor(identity, enrichment) : null;
};

/**
 * Builds the deterministic attachment id used for a single-entity
 * `security.entity` attachment. Matches the scheme used by
 * `security.get_entity` so a later call for the same entity bumps the shared
 * attachment version rather than creating a new record.
 *
 * We hash the identifier because agent_builder's markdown pipeline
 * (remark-parse-no-trim + createTagParser in
 * x-pack/platform/plugins/shared/agent_builder/public/application/components/
 * conversations/conversation_rounds/round_response/markdown_plugins/utils.ts)
 * cannot recognise `<render_attachment id="..." />` when the id contains
 * characters that trigger inline autolinking (e.g. `@` in user ids auto-links
 * to `mailto:`). When that happens the tag is shattered across multiple AST
 * nodes and is rendered as literal text instead of as the rich attachment.
 * Hashing produces a pure hex id that is safe for inline placement. Remove
 * once the upstream parser recognises `<render_attachment>` as an HTML tag
 * and no longer depends on autolink-safe ids.
 */
export const buildSingleEntityAttachmentId = (
  identifierType: EntityIdentifierType,
  identifier: string
): string => {
  const hash = createHash('sha256').update(`${identifierType}:${identifier}`).digest('hex');
  return `${SecurityAgentBuilderAttachments.entity}:${identifierType}:${hash}`;
};

/**
 * Builds a deterministic attachment id for a multi-entity search result. The
 * hash is derived from the sorted `"{type}:{identifier}"` pairs so two
 * searches that surface the same cohort converge on the same attachment and
 * `update` bumps the version instead of piling up new pills.
 */
export const buildListEntityAttachmentId = (
  entities: Array<{ identifierType: EntityIdentifierType; identifier: string }>
): string => {
  const serialized = entities
    .map((e) => `${e.identifierType}:${e.identifier}`)
    .sort()
    .join('\n');
  const hash = createHash('sha256').update(serialized).digest('hex');
  return `${SecurityAgentBuilderAttachments.entity}:list:${hash}`;
};

/**
 * Creates or refreshes a `security.entity` attachment. Thin wrapper over
 * {@link ensureAttachment} that pins the type.
 */
export const ensureEntityAttachment = async ({
  attachments,
  id,
  data,
  description,
  logger,
}: {
  attachments: AttachmentStateManager;
  id: string;
  data: Record<string, unknown>;
  description: string;
  logger: Logger;
}): Promise<{ attachmentId: string; version: number } | null> =>
  ensureAttachment({
    attachments,
    id,
    type: SecurityAgentBuilderAttachments.entity,
    data,
    description,
    logger,
  });
