/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { cleanup, generate, type PartialConfig } from '@kbn/data-forge';
import type { ScoutLogger } from '@kbn/scout-oblt';

/**
 * Programmatic data-forge config for SLO API tests (`fake_hosts` dataset).
 * Installed once per run by `global.setup.ts`; the window extends into the future so data stays
 * fresh for the whole run.
 */
export const SLO_SCOUT_HOSTS_DATA_FORGE_CONFIG: PartialConfig = {
  schedule: [
    {
      template: 'good',
      start: 'now-15m',
      end: 'now+15m',
      metrics: [
        { name: 'system.cpu.user.pct', method: 'linear', start: 2.5, end: 2.5 },
        { name: 'system.cpu.total.pct', method: 'linear', start: 0.5, end: 0.5 },
        { name: 'system.cpu.total.norm.pct', method: 'linear', start: 0.8, end: 0.8 },
      ],
    },
  ],
  indexing: { dataset: 'fake_hosts', eventsPerCycle: 1 },
};

/** `fake_stack` config matching what `sloData.generateSloData()` installs. */
const SLO_SCOUT_STACK_DATA_FORGE_CONFIG: PartialConfig = {
  indexing: { dataset: 'fake_stack' },
};

const SLO_SCOUT_HOSTS_INDEX_PATTERN = 'kbn-data-forge-fake_hosts.*';
const SLO_SCOUT_STACK_INDEX_PATTERN = 'kbn-data-forge-fake_stack.*';

/**
 * Deletes the concrete indices matching `pattern`. data-forge `cleanup()` only removes templates,
 * and Elasticsearch rejects wildcard deletes by default (`action.destructive_requires_name`).
 */
const deleteIndicesMatching = async (esClient: Client, pattern: string): Promise<void> => {
  const indices = Object.keys(
    await esClient.indices.get({ index: pattern, allow_no_indices: true, ignore_unavailable: true })
  );
  if (indices.length === 0) {
    return;
  }
  await esClient.indices.delete({ index: indices });
};

export async function installSloScoutHostsDataForge(
  esClient: Client,
  log: ScoutLogger
): Promise<void> {
  await generate({ client: esClient, config: SLO_SCOUT_HOSTS_DATA_FORGE_CONFIG, logger: log });
}

export async function removeSloScoutHostsDataForge(
  esClient: Client,
  log: ScoutLogger
): Promise<void> {
  await deleteIndicesMatching(esClient, SLO_SCOUT_HOSTS_INDEX_PATTERN);
  await cleanup({ client: esClient, config: SLO_SCOUT_HOSTS_DATA_FORGE_CONFIG, logger: log });
}

/** Removes the `fake_stack` indices and templates installed by `sloData.generateSloData()`. */
export async function removeSloScoutStackData(esClient: Client, log: ScoutLogger): Promise<void> {
  await deleteIndicesMatching(esClient, SLO_SCOUT_STACK_INDEX_PATTERN);
  await cleanup({ client: esClient, config: SLO_SCOUT_STACK_DATA_FORGE_CONFIG, logger: log });
}
