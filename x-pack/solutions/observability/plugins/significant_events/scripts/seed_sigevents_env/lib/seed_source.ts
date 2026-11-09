/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type {
  CreateSourceRequest,
  ListSourcesResponse,
  NightshiftSource,
  SourceMutationResponse,
} from '@kbn/nightshift-shared';
import type { ConnectionConfig } from './get_connection_config';
import { kibanaRequest } from './kibana';

export const SEED_SOURCE_TITLE = 'Significant events seed';

export type SeedSource = Pick<NightshiftSource, 'id' | 'title' | 'slug' | 'view_name'>;

/** The list `search` is a title prefix match, so the exact title is compared client side. */
export const findSeedSource = async (
  config: ConnectionConfig,
  space: string
): Promise<SeedSource | undefined> => {
  const { status, data } = await kibanaRequest(
    config,
    'GET',
    `/internal/nightshift/sources?search=${encodeURIComponent(SEED_SOURCE_TITLE)}&per_page=100`,
    undefined,
    space
  );
  if (status >= 300) {
    throw new Error(`Failed to list sources: ${status} ${JSON.stringify(data)}`);
  }
  const { sources } = data as ListSourcesResponse;
  return sources.find(({ title }) => title === SEED_SOURCE_TITLE);
};

/** Reuses or creates the seed source. Run it after the logs are seeded: create executes the query. */
export const ensureSeedSource = async (
  config: ConnectionConfig,
  space: string,
  streamName: string,
  log: ToolingLog
): Promise<SeedSource> => {
  const existing = await findSeedSource(config, space);
  if (existing) {
    log.info(`Reusing seed source ${existing.id} with view "${existing.view_name}"`);
    return existing;
  }

  const body: CreateSourceRequest = {
    title: SEED_SOURCE_TITLE,
    description: 'Synthetic significant events seed data',
    tags: ['seed'],
    esql: `FROM ${streamName}`,
  };
  const { status, data } = await kibanaRequest(
    config,
    'POST',
    '/internal/nightshift/sources',
    body,
    space
  );
  if (status >= 300) {
    throw new Error(`Failed to create the seed source: ${status} ${JSON.stringify(data)}`);
  }
  const { source } = data as SourceMutationResponse;
  log.info(`Created seed source ${source.id} with view "${source.view_name}"`);
  return source;
};
