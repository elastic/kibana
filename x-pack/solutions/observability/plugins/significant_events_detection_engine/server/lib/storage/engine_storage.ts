/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { EngineConfig } from '../../../common';
import { DEFAULT_ENGINE_CONFIG } from '../../../common';
import { createEventsStore, type IEventsStore } from './events_store';
import { withCurrentConfigNames } from './legacy_names';
import type { IManagedIndexInstaller } from './managed_index';
import { createRecordsStore, type IRecordsStore } from './records_store';
import { createStateStore, type IStateStore } from './state_store';

/**
 * Everything the engine stores for one space. Every read filters by the space and every write
 * stamps it; all of it runs as the Kibana system user, behind the routes' privilege checks, so
 * users need no access to the engine's hidden indices.
 */
export interface IEngineStorage {
  spaceId: string;
  state: IStateStore;
  events: IEventsStore;
  records: IRecordsStore;
  /** Stored settings merged over the defaults, field by field. */
  getConfig(): Promise<EngineConfig>;
  /**
   * Removes what runs produced, keeping settings, cost, schedule and rules. What people taught
   * the engine (labels, memory) and the detectors it learned stay unless `includeLearning`.
   */
  clearRunData(options?: { includeLearning?: boolean }): Promise<void>;
}

/** Merges a stored config over the defaults, so a config saved by an older build gains new fields. */
export function withConfigDefaults(storedConfig: Partial<EngineConfig> | undefined): EngineConfig {
  const stored = withCurrentConfigNames(storedConfig);
  return {
    ...DEFAULT_ENGINE_CONFIG,
    ...stored,
    strategies: { ...DEFAULT_ENGINE_CONFIG.strategies, ...stored?.strategies },
    agent: { ...DEFAULT_ENGINE_CONFIG.agent, ...stored?.agent },
    baseline: { ...DEFAULT_ENGINE_CONFIG.baseline, ...stored?.baseline },
    triage: { ...DEFAULT_ENGINE_CONFIG.triage, ...stored?.triage },
    learning: {
      ...DEFAULT_ENGINE_CONFIG.learning,
      ...stored?.learning,
      autonomy: { ...DEFAULT_ENGINE_CONFIG.learning.autonomy, ...stored?.learning?.autonomy },
      acceptance: {
        ...DEFAULT_ENGINE_CONFIG.learning.acceptance,
        ...stored?.learning?.acceptance,
      },
    },
  };
}

export function createEngineStorage({
  internalEsClient,
  dataStreams,
  installer,
  spaceId,
}: {
  internalEsClient: ElasticsearchClient;
  dataStreams: DataStreamsStart;
  installer: IManagedIndexInstaller;
  spaceId: string;
}): IEngineStorage {
  const state = createStateStore({ esClient: internalEsClient, installer, spaceId });
  const events = createEventsStore({ esClient: internalEsClient, installer, spaceId });
  const records = createRecordsStore({ dataStreams, esClient: internalEsClient, spaceId });

  return {
    spaceId,
    state,
    events,
    records,

    async getConfig() {
      return withConfigDefaults(await state.get('config'));
    },

    async clearRunData({ includeLearning = false } = {}) {
      await Promise.all([
        events.clear(),
        records.clear(),
        state.clear({
          keep: [
            'config',
            'cost',
            'auto_run',
            'rules',
            'lease',
            // Knowledge too: what topology and customer rules showed holds across a reset.
            ...(includeLearning
              ? []
              : (['memory_notes', 'incident', 'candidate', 'topology', 'customer_rule'] as const)),
          ],
        }),
      ]);
    },
  };
}
