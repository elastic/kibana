/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { SIGNAL_CARD_IDS, TIME_RANGE_OPTIONS, type SignalCardId } from '../home/constants';

/** Tiles can hold hundreds of entities. The server reads the riskiest of these first. */
export const MAX_ENTITY_IDS_PER_TILE = 200;

/** The Entity Analytics view captured when the user clicks "Generate AI brief". */
export const EntityAnalyticsScope = lazySchema(() =>
  z.object({
    period: z.enum(TIME_RANGE_OPTIONS),
    /** When the view was captured. The period ends here. */
    capturedAt: z.iso.datetime(),
    /** The page's entity filters (entity type, risk level, criticality, data source, watchlist). */
    entityFilters: z.record(z.string().max(64), z.array(z.string().max(256)).max(50)).optional(),
    /** The tile the user selected, if any. It orders the brief and never filters the headline values. */
    focusTileId: z.enum(SIGNAL_CARD_IDS).optional(),
    tiles: z.partialRecord(
      z.enum(SIGNAL_CARD_IDS),
      z.object({
        /** The tile's title as the page shows it, translated. */
        title: z.string().min(1).max(200),
        /** What the tile counts, as the page describes it, translated. */
        description: z.string().min(1).max(500).optional(),
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
export type EntityAnalyticsScopeTile = NonNullable<EntityAnalyticsScope['tiles'][SignalCardId]>;
