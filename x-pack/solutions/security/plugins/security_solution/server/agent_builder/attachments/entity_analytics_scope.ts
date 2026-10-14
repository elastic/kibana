/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* PoC (do not merge): the Entity Analytics view captured for the AI brief. Not production code. */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Filter } from '@kbn/es-query';
import { z, lazySchema } from '@kbn/zod/v4';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID } from '../tools/entity_analytics/generate_brief_tool';

/** The needs-attention tiles on the Entity Analytics page (`SignalCardId`). */
export const BRIEF_TILE_IDS = [
  'entitiesWithAlerts',
  'entitiesWithAnomalies',
  'riskMovers',
  'newlyHighCritical',
  'watchlisted',
  'newEntity',
] as const;
export type BriefTileId = (typeof BRIEF_TILE_IDS)[number];

/** Page titles of the tiles, so the brief uses the same words as the page. */
export const BRIEF_TILE_TITLES: Record<BriefTileId, string> = {
  entitiesWithAlerts: 'Entities with alerts',
  entitiesWithAnomalies: 'Entities with anomalies',
  riskMovers: 'Risk movers',
  newlyHighCritical: 'Newly high/critical',
  watchlisted: 'Watchlisted',
  newEntity: 'New entity',
};

export const MAX_ENTITY_IDS_PER_TILE = 20;
const MAX_FILTERS_JSON_LENGTH = 20_000;

/** The Entity Analytics view captured when the user clicks "Generate AI brief". */
export const entityAnalyticsScopeSchema = lazySchema(() =>
  z.object({
    period: z.enum(['24h', '7d', '30d']),
    capturedAt: z.string().max(64),
    query: z
      .object({ query: z.string().max(4000), language: z.enum(['kuery', 'lucene']) })
      .optional(),
    /** Enabled filter pills, as the page holds them. */
    filters: z
      .array(z.looseObject({ meta: z.looseObject({}), query: z.looseObject({}).optional() }))
      .max(20)
      .refine((filters) => JSON.stringify(filters).length <= MAX_FILTERS_JSON_LENGTH, {
        message: `filters must serialise to at most ${MAX_FILTERS_JSON_LENGTH} characters`,
      })
      .optional(),
    entityFilters: z.record(z.string().max(64), z.array(z.string().max(256)).max(50)).optional(),
    focusTileId: z.enum(BRIEF_TILE_IDS).optional(),
    tiles: z.partialRecord(
      z.enum(BRIEF_TILE_IDS),
      z.object({
        /** The tile's value as shown. 0 is a real zero (the tile shows "—"). */
        value: z.number().int().min(0),
        /** Change against the previous period of equal length. Absent when there is no comparison. */
        delta: z.number().int().optional(),
        /** True when the tile has no data source (for example a missing risk index). */
        unavailable: z.boolean().optional(),
        /** Resolved entity ids in the tile, as the page's own tile queries define them. */
        entityIds: z.array(z.string().min(1).max(1024)).max(MAX_ENTITY_IDS_PER_TILE),
      })
    ),
  })
);

export type EntityAnalyticsScope = z.infer<typeof entityAnalyticsScopeSchema>;
export type EntityAnalyticsScopeTile = NonNullable<EntityAnalyticsScope['tiles'][BriefTileId]>;

/** The scope's filter pills as Kibana filters. They are validated as objects above. */
export const scopeFilters = (scope: EntityAnalyticsScope): Filter[] =>
  (scope.filters ?? []) as Filter[];

/** A short label for a filter pill. */
export const filterLabel = ({ meta }: Filter): string => {
  if (meta.alias) {
    return meta.alias;
  }
  const params = meta.params as { query?: unknown } | unknown[] | undefined;
  const value = Array.isArray(params)
    ? params.join(', ')
    : params && typeof params === 'object' && 'query' in params
    ? String(params.query)
    : meta.value;
  return `${meta.negate ? 'NOT ' : ''}${meta.key ?? 'custom filter'}${
    value ? `: ${String(value)}` : ''
  }`.slice(0, 200);
};

const formatScope = (id: string, scope: EntityAnalyticsScope): string => {
  const tiles = BRIEF_TILE_IDS.flatMap((tileId) => {
    const tile = scope.tiles[tileId];
    if (!tile) {
      return [];
    }
    if (tile.unavailable) {
      return [`${BRIEF_TILE_TITLES[tileId]} unavailable`];
    }
    return [
      `${BRIEF_TILE_TITLES[tileId]} ${tile.value}${
        tile.delta === undefined ? '' : ` (${tile.delta >= 0 ? '+' : ''}${tile.delta})`
      }`,
    ];
  });
  return [
    `Entity Analytics view (attachment id "${id}"), captured ${scope.capturedAt}`,
    `Period: last ${scope.period}`,
    `Search query: ${scope.query?.query || 'none'}; filters: ${
      scopeFilters(scope).map(filterLabel).join(', ') || 'none'
    }; entity filters: ${JSON.stringify(scope.entityFilters ?? {})}; selected tile: ${
      scope.focusTileId ? BRIEF_TILE_TITLES[scope.focusTileId] : 'none'
    }`,
    `Needs-attention tiles (change vs previous ${scope.period}): ${tiles.join('; ')}`,
  ].join('\n');
};

export const createEntityAnalyticsScopeAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.entityAnalyticsScope,
  validate: (input) => {
    const result = entityAnalyticsScopeSchema.safeParse(input);
    return result.success
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const scope = entityAnalyticsScopeSchema.parse(attachment.data);
    return {
      getRepresentation: () => ({ type: 'text', value: formatScope(attachment.id, scope) }),
    };
  },
  getTools: () => [SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID],
  getAgentDescription: () =>
    `An Entity Analytics view attachment is the page the user was looking at when they asked for an AI brief. When the user asks for the brief, call ${SECURITY_GENERATE_ENTITY_ANALYTICS_BRIEF_TOOL_ID} with the attachment id. Its result contains a \`brief\` markdown string: reply with that string EXACTLY as returned (every line, including any <render_attachment ... /> line, unchanged), then add one short sentence inviting a follow-up question. Do not rewrite, summarise, reorder or add numbers. While generating the brief, do not call tools that change data (watchlists, criticality, leads). For follow-up questions, use the entity analytics tools and say if a tool cannot honour the captured scope.`,
});
