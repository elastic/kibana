/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/core-data-streams-server';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import type {
  ActivityEntry,
  EngineSignal,
  EngineObservation,
  EngineRunSummary,
} from '../../../common';

const double = { type: 'double' as const };
const timestamp = mappings.date({ format: 'strict_date_optional_time' });

/**
 * Append-only records live in data streams: they are never updated, they age out on their own
 * retention, and core stamps the space on every document.
 */
export const OBSERVATIONS_DATA_STREAM = '.significant_events-detection_engine-observations';
export const SIGNALS_DATA_STREAM = '.significant_events-detection_engine-signals';
// Renamed with `detection_id` -> `signal_id`: the Kibana system user may create these streams but
// not change their mappings, so a renamed field gets a new stream instead of a mapping update.
// A new name must not start with an old one: each template matches `<name>*` at the same
// priority, and Elasticsearch refuses a template whose pattern overlaps one still installed.
export const ACTIVITY_DATA_STREAM = '.significant_events-detection_engine-run_activity';
export const RUNS_DATA_STREAM = '.significant_events-detection_engine-run_summaries';

export const observationsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': timestamp,
    run_id: mappings.keyword(),
    strategy: mappings.keyword(),
    fingerprint: mappings.keyword(),
    service: mappings.keyword(),
    bucket_start: timestamp,
    value: double,
    looks_off: mappings.boolean(),
    mode: mappings.keyword(),
  },
} satisfies MappingsDefinition;

export const signalsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': timestamp,
    signal_id: mappings.keyword(),
    run_id: mappings.keyword(),
    strategy: mappings.keyword(),
    mode: mappings.keyword(),
    fingerprint: mappings.keyword(),
    service: mappings.keyword(),
    bucket_start: timestamp,
    value: double,
    importance: double,
    outcome: mappings.keyword(),
    event_id: mappings.keyword(),
    rule_id: mappings.keyword(),
    source_id: mappings.keyword(),
    baseline: mappings.object({ properties: { decision: mappings.keyword() } }),
  },
} satisfies MappingsDefinition;

export const activityMappings = {
  dynamic: false,
  properties: {
    '@timestamp': timestamp,
    run_id: mappings.keyword(),
    step: mappings.keyword(),
    action: mappings.keyword(),
    strategy: mappings.keyword(),
    service: mappings.keyword(),
    signal_id: mappings.keyword(),
    event_id: mappings.keyword(),
    message: mappings.text(),
  },
} satisfies MappingsDefinition;

export const runsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': timestamp,
    run_id: mappings.keyword(),
    trigger: mappings.keyword(),
    skip_reason: mappings.keyword(),
    signals: mappings.long(),
    open_events: mappings.long(),
  },
} satisfies MappingsDefinition;

export type StoredObservation = EngineObservation & Record<string, unknown>;
export type StoredSignal = EngineSignal & Record<string, unknown>;
export type StoredActivity = ActivityEntry & Record<string, unknown>;
export type StoredRun = EngineRunSummary & { '@timestamp': string } & Record<string, unknown>;

// Casts: the stored documents carry `_source`-only fields the mappings leave unindexed.
export const observationsDataStream: DataStreamDefinition<
  typeof observationsMappings,
  StoredObservation
> = {
  name: OBSERVATIONS_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    // The baseline reads at most six hours back; a few days leave room for replay and support.
    lifecycle: { data_retention: '3d' },
    mappings: observationsMappings,
  },
};

export const signalsDataStream: DataStreamDefinition<typeof signalsMappings, StoredSignal> = {
  name: SIGNALS_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '30d' },
    mappings: signalsMappings,
  },
};

export const activityDataStream: DataStreamDefinition<typeof activityMappings, StoredActivity> = {
  name: ACTIVITY_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '30d' },
    mappings: activityMappings,
  },
};

export const runsDataStream: DataStreamDefinition<typeof runsMappings, StoredRun> = {
  name: RUNS_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '14d' },
    mappings: runsMappings,
  },
};
