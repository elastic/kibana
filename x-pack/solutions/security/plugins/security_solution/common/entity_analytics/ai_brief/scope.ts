/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

/** Agent Builder attachment type holding the Entity Analytics view captured for the AI brief. */
export const ENTITY_ANALYTICS_SCOPE_ATTACHMENT_TYPE = 'security.entity_analytics_scope';

/** The needs-attention tiles on the Entity Analytics page, matching the page's `SignalCardId`. */
export const BRIEF_TILE_IDS = [
  'entitiesWithAlerts',
  'entitiesWithAnomalies',
  'riskMovers',
  'newlyHighCritical',
  'watchlisted',
  'newEntity',
] as const;
export type BriefTileId = (typeof BRIEF_TILE_IDS)[number];

const BRIEF_PERIODS = ['24h', '7d', '30d'] as const;
export type BriefPeriod = (typeof BRIEF_PERIODS)[number];

/** Tiles can hold hundreds of entities. The server reads the riskiest of these first. */
export const MAX_ENTITY_IDS_PER_TILE = 200;
const MAX_FILTERS = 20;
const MAX_FILTERS_JSON_LENGTH = 20_000;

/** The Entity Analytics view captured when the user clicks "Generate AI brief". */
export const EntityAnalyticsScope = lazySchema(() =>
  z.object({
    period: z.enum(BRIEF_PERIODS),
    /** When the view was captured. The period ends here. */
    capturedAt: z.iso.datetime(),
    /** The page's search bar query. */
    query: z
      .object({ query: z.string().max(4000), language: z.enum(['kuery', 'lucene']) })
      .optional(),
    /** The page's enabled filter pills, as Kibana `Filter` objects. */
    filters: z
      .array(z.looseObject({ meta: z.looseObject({}), query: z.looseObject({}).optional() }))
      .max(MAX_FILTERS)
      .refine((filters) => JSON.stringify(filters).length <= MAX_FILTERS_JSON_LENGTH, {
        message: `filters must serialise to at most ${MAX_FILTERS_JSON_LENGTH} characters`,
      })
      .optional(),
    /** The page's entity filters (entity type, risk level, criticality, data source, watchlist). */
    entityFilters: z.record(z.string().max(64), z.array(z.string().max(256)).max(50)).optional(),
    /** The tile the user selected, if any. It orders the brief and never filters the headline values. */
    focusTileId: z.enum(BRIEF_TILE_IDS).optional(),
    tiles: z.partialRecord(
      z.enum(BRIEF_TILE_IDS),
      z.object({
        /** The tile's value as shown. 0 is a real zero (the tile shows "—"). */
        value: z.number().int().min(0),
        /** Change against the previous period of equal length. Absent when there is no comparison. */
        delta: z.number().int().optional(),
        /** True when the tile has no data source, for example a missing risk index. */
        unavailable: z.literal(true).optional(),
        /** Resolved entity ids in the tile, as the page's tile queries return them. */
        entityIds: z.array(z.string().min(1).max(1024)).max(MAX_ENTITY_IDS_PER_TILE),
      })
    ),
  })
);

export type EntityAnalyticsScope = z.infer<typeof EntityAnalyticsScope>;
export type EntityAnalyticsScopeTile = NonNullable<EntityAnalyticsScope['tiles'][BriefTileId]>;
