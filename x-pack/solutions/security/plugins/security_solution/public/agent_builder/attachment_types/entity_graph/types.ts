/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { IdentifierType } from '../../../../common/api/entity_analytics/common/common.gen';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';

/**
 * Client-side mirror of the server `security.entity_graph` payload
 * (see server/agent_builder/attachments/entity_graph.ts). Kept in sync with
 * the server zod schema; the renderer seeds the graph fetch from these fields.
 */
export interface EntityGraphAttachmentData {
  identifierType: IdentifierType;
  identifier: string;
  /** Canonical Entity Store `entity.id` (EUID) the graph is centered on. */
  entityStoreId: string;
  timeRange: { from: string; to: string };
  attachmentLabel?: string;
}

export type EntityGraphAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.entityGraph,
  EntityGraphAttachmentData
>;
