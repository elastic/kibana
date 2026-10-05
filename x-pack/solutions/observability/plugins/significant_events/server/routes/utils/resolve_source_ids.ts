/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ID_LENGTH } from '@kbn/significant-events-schema';
import { MAX_SOURCES_PER_PAGE } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { z } from '@kbn/zod/v4';
import { listAllSources } from './list_all_sources';

/** Most source ids one request may filter by. Matches the page size of the source list. */
export const MAX_SOURCE_IDS_PER_REQUEST = MAX_SOURCES_PER_PAGE;

const sourceIdSchema = z.string().min(1).max(MAX_ID_LENGTH);

/** A JSON body list of source ids. */
export const sourceIdsArraySchema = ({ min, max }: { min: number; max: number }) =>
  z.array(sourceIdSchema).min(min).max(max);

/**
 * A query param that arrives as one id or a repeated list, and always parses as a list.
 */
export const sourceIdsQuerySchema = (max: number) =>
  z.union([sourceIdSchema.transform((id) => [id]), z.array(sourceIdSchema).max(max)]).optional();

/**
 * Source ids a read is scoped to. An omitted filter is the whole catalog. A
 * caller-provided list is returned as-is, since those values are already
 * source ids and checking them would list every source on the read path.
 */
export async function requestedOrAllSourceIds(
  sourceIds: string[] | undefined,
  sourcesClient: SourcesClient
): Promise<string[]> {
  if (sourceIds?.length) {
    return sourceIds;
  }
  return (await listAllSources(sourcesClient)).map((source) => source.id);
}
