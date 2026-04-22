/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Logger } from '@kbn/logging';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
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

export interface EntityAttachmentDescriptor {
  identifierType: AttachmentIdentifierType;
  identifier: string;
  attachmentLabel: string;
}

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
 */
export const describeAttachmentForRow = ({
  columns,
  row,
}: {
  columns: Array<{ name: string }>;
  row: unknown[];
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
