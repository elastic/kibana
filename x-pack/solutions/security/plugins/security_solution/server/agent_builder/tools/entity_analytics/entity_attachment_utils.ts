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

export const ENTITY_STORE_ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
export const ENTITY_STORE_ENTITY_ID_FIELD = 'entity.id';
export const ENTITY_STORE_ENTITY_NAME_FIELD = 'entity.name';

export const ATTACHMENT_IDENTIFIER_TYPES = ['host', 'user', 'service', 'generic'] as const;
export type AttachmentIdentifierType = (typeof ATTACHMENT_IDENTIFIER_TYPES)[number];

export const isAttachmentIdentifierType = (value: unknown): value is AttachmentIdentifierType =>
  typeof value === 'string' &&
  (ATTACHMENT_IDENTIFIER_TYPES as readonly string[]).includes(value);

/**
 * Strips the `{type}:` prefix from a canonical entity id so the attachment
 * receives the bare identity value the rich renderer expects (host.name,
 * user.name, service.name). For `generic` entities we keep the full id because
 * those records are matched on `entity.id` directly.
 */
export const stripEntityIdPrefix = (
  entityId: string,
  identifierType: AttachmentIdentifierType
): string => {
  if (identifierType === 'generic') {
    return entityId;
  }
  const prefix = `${identifierType}:`;
  return entityId.startsWith(prefix) ? entityId.slice(prefix.length) : entityId;
};

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
 * `EntityAttachmentDescriptor` so the pure row-to-identifier extractor stays
 * free of side-effectful fetches.
 */
export interface EntityAttachmentEnrichment {
  riskStats?: EntityAttachmentRiskStats;
  resolutionRiskStats?: EntityAttachmentRiskStats;
}

export interface EntityAttachmentDescriptor {
  identifierType: AttachmentIdentifierType;
  identifier: string;
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

export const getRowValue = (
  columns: Array<{ name: string }>,
  row: unknown[],
  columnName: string
): unknown => {
  const idx = columns.findIndex((col) => col.name === columnName);
  return idx >= 0 ? row[idx] : undefined;
};

/**
 * Derives the attachment payload from a resolved entity row. Returns `null`
 * when we cannot extract a trustworthy identifier (e.g. missing type) so the
 * caller can skip the attachment side-effect instead of emitting garbage.
 *
 * The optional `enrichment` argument lets callers fold in async-fetched
 * extras (risk stats, resolution stats) without re-walking `columns`.
 * Kept optional so existing call sites — and the row-only unit tests —
 * don't need to supply enrichment when they only care about identity.
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
  const rawType = getRowValue(columns, row, ENTITY_STORE_ENTITY_TYPE_FIELD);
  if (!isAttachmentIdentifierType(rawType)) {
    return null;
  }

  const rawId = getRowValue(columns, row, ENTITY_STORE_ENTITY_ID_FIELD);
  const rawName = getRowValue(columns, row, ENTITY_STORE_ENTITY_NAME_FIELD);

  const bareFromId = typeof rawId === 'string' ? stripEntityIdPrefix(rawId, rawType) : undefined;
  const bareName = typeof rawName === 'string' && rawName.length > 0 ? rawName : undefined;

  const identifier = bareName ?? bareFromId;
  if (!identifier) {
    return null;
  }

  return {
    identifierType: rawType,
    identifier,
    attachmentLabel: `${rawType}: ${identifier}`,
    ...(enrichment?.riskStats ? { riskStats: enrichment.riskStats } : {}),
    ...(enrichment?.resolutionRiskStats
      ? { resolutionRiskStats: enrichment.resolutionRiskStats }
      : {}),
  };
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
  identifierType: AttachmentIdentifierType,
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
  entities: Array<{ identifierType: AttachmentIdentifierType; identifier: string }>
): string => {
  const serialized = entities
    .map((e) => `${e.identifierType}:${e.identifier}`)
    .sort()
    .join('\n');
  const hash = createHash('sha256').update(serialized).digest('hex');
  return `${SecurityAgentBuilderAttachments.entity}:list:${hash}`;
};

/**
 * Creates or refreshes a `security.entity` attachment with the provided id
 * and data. Uses the deterministic id so repeated lookups in the same
 * conversation bump the version instead of piling up pills. Failures are
 * logged and swallowed — the tool result itself is still useful without the
 * inline card.
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
}): Promise<{ attachmentId: string; version: number } | null> => {
  try {
    const existing = attachments.getAttachmentRecord(id);
    if (existing) {
      const updated = await attachments.update(id, { data, description });
      if (!updated) {
        return null;
      }
      return { attachmentId: updated.id, version: updated.current_version };
    }

    const created = await attachments.add({
      id,
      type: SecurityAgentBuilderAttachments.entity,
      data,
      description,
    });
    return { attachmentId: created.id, version: created.current_version };
  } catch (error) {
    logger.warn(
      `Failed to persist security.entity attachment for ${id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
};
