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
import { ensureAttachment } from './attachment_utils';
import type { EntityIdentifierType } from './entity_resolution';

// Underscore-free stand-in for the `security.entity_graph` attachment type
const ENTITY_GRAPH_ATTACHMENT_ID_PREFIX = 'security.graph';

/**
 * Builds the deterministic attachment id for a single-entity graph preview.
 * Hashing the canonical `entity.id` means a later graph request for the same
 * entity bumps the shared attachment version rather than creating a new record.
 */
export const buildEntityGraphAttachmentId = (
  identifierType: EntityIdentifierType,
  entityStoreId: string
): string => {
  const hash = createHash('sha256').update(`${identifierType}:${entityStoreId}`).digest('hex');
  return `${ENTITY_GRAPH_ATTACHMENT_ID_PREFIX}:${identifierType}:${hash}`;
};

interface EntityGraphAttachmentData {
  identifierType: EntityIdentifierType;
  identifier: string;
  /** Canonical Entity Store `entity.id` (EUID) the graph is centered on. */
  entityStoreId: string;
  timeRange: { from: string; to: string };
  attachmentLabel?: string;
}

/**
 * Creates or refreshes a `security.entity_graph` attachment
 */
export const ensureEntityGraphAttachment = async ({
  attachments,
  id,
  data,
  description,
  logger,
}: {
  attachments: AttachmentStateManager;
  id: string;
  data: EntityGraphAttachmentData;
  description: string;
  logger: Logger;
}): Promise<{ attachmentId: string; version: number } | null> =>
  ensureAttachment({
    attachments,
    id,
    type: SecurityAgentBuilderAttachments.entityGraph,
    // Spread into a fresh object literal so it satisfies `ensureAttachment`'s `Record<string, unknown>` param
    data: { ...data },
    description,
    logger,
  });
