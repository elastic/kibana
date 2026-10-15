/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  BRIEF_TILE_IDS,
  ENTITY_ANALYTICS_SCOPE_ATTACHMENT_TYPE,
  EntityAnalyticsScope,
} from '../../../common/entity_analytics/ai_brief/scope';
import { SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID } from '../tools/entity_analytics/generate_entity_analytics_brief_tool';
import {
  BRIEF_PERIOD_LABELS,
  BRIEF_TILE_TITLES,
  describeEntityFilter,
  describeTileChange,
  filterLabel,
  getScopeFilters,
} from '../tools/entity_analytics/brief/describe_scope';

/** Attachment type for the Entity Analytics view captured by the "Generate AI brief" button. */
export const createEntityAnalyticsScopeAttachmentType = (): AttachmentTypeDefinition => ({
  id: ENTITY_ANALYTICS_SCOPE_ATTACHMENT_TYPE,
  validate: (input) => {
    const result = EntityAnalyticsScope.safeParse(input);
    if (!result.success) {
      return { valid: false, error: result.error.message };
    }
    return { valid: true, data: result.data };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const scope = EntityAnalyticsScope.parse(attachment.data);
    return {
      getRepresentation: () => ({ type: 'text', value: formatScope(attachment.id, scope) }),
    };
  },
  getTools: () => [SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID],
  getAgentDescription: () =>
    `An ${ENTITY_ANALYTICS_SCOPE_ATTACHMENT_TYPE} attachment is the Entity Analytics page view the user was looking at when they asked for an AI brief. When the user asks for the brief, call ${SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID} with this attachment's id as scopeAttachmentId. Reply with the returned \`brief\` string exactly as returned (every line, including any <render_attachment ... /> line, unchanged), then add one short sentence inviting a follow-up question. Copy each render_attachment id character for character, even when it looks like a type name: an altered id renders nothing. Do not rewrite, summarise, reorder or add numbers. While generating the brief, do not call tools that change data (watchlists, asset criticality, leads, entity resolution). For follow-up questions, use the entity analytics tools and say when a tool cannot honour the captured scope (period, search, filters).`,
});

const formatScope = (attachmentId: string, scope: EntityAnalyticsScope): string => {
  const { period, capturedAt, query, entityFilters = {}, focusTileId, tiles } = scope;
  const entityFilterLabels = Object.entries(entityFilters).map(([key, values]) =>
    describeEntityFilter(key, values)
  );
  const tileLabels = BRIEF_TILE_IDS.flatMap((tileId) => {
    const tile = tiles[tileId];
    if (!tile) {
      return [];
    }
    const value = tile.unavailable ? '' : ` ${tile.value}`;
    return [`${BRIEF_TILE_TITLES[tileId]}${value} (${describeTileChange(tile, period)})`];
  });
  return [
    `Entity Analytics view (attachment id "${attachmentId}"), captured ${capturedAt}`,
    `Period: last ${BRIEF_PERIOD_LABELS[period]}`,
    `Search: ${query?.query || 'none'}`,
    `Filters: ${getScopeFilters(scope).map(filterLabel).join('; ') || 'none'}`,
    `Entity filters: ${entityFilterLabels.join('; ') || 'none'}`,
    `Selected count: ${focusTileId ? BRIEF_TILE_TITLES[focusTileId] : 'none'}`,
    `Counts of flagged entities: ${tileLabels.join('; ') || 'none'}`,
  ].join('\n');
};
