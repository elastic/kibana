/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  FP_TP_RAW_EVENT_INGEST_PIPELINE,
  FP_TP_RAW_EVENT_INDEX_PREFIX,
  FP_TP_RAW_EVENT_INDEX_TEMPLATE,
} from './constants';

/**
 * Field budget for the seeded raw-event streams. The composed `logs@mappings`
 * and `ecs@mappings` components do not raise the default (1000); ECS endpoint
 * documents carry a lot of fields, so a scenario with a rich `process`/
 * `network` payload would otherwise trip `limit of total fields` mid-seed.
 */
export const FP_TP_RAW_EVENT_TOTAL_FIELDS_LIMIT = 6000;

/**
 * Priority of the seeder-owned index template. Above the generic `logs`
 * template (priority 100) and the Endpoint `logs-endpoint.events.<category>`
 * templates (priority 200), so ours is the template that applies to these names.
 */
export const FP_TP_RAW_EVENT_TEMPLATE_PRIORITY = 250;

/**
 * Settings for a seeded raw-event stream. Only the field budget is set; the
 * composed components carry mappings only, so other settings stay at defaults.
 */
export const rawEventIndexSettings = (): Record<string, unknown> => ({
  'index.mapping.total_fields.limit': FP_TP_RAW_EVENT_TOTAL_FIELDS_LIMIT,
});

/**
 * Explicit mappings for the fields the workflow queries and reads. Everything
 * else (`process.command_line`, `network.*`, `file.*`, …) stays dynamic so a new
 * scenario field needs no change here; the field budget above absorbs it.
 */
export const rawEventIndexMappings = (): Record<string, unknown> => ({
  properties: {
    message: { type: 'text' },
    labels: { properties: { ad_portable_seed: { type: 'keyword' } } },
    event: {
      properties: {
        id: { type: 'keyword' },
        ingested: { type: 'date' },
        kind: { type: 'keyword' },
        module: { type: 'keyword' },
        dataset: { type: 'keyword' },
        category: { type: 'keyword' },
        type: { type: 'keyword' },
      },
    },
    host: { properties: { id: { type: 'keyword' }, name: { type: 'keyword' } } },
    user: { properties: { name: { type: 'keyword' }, domain: { type: 'keyword' } } },
    process: {
      properties: {
        name: { type: 'keyword' },
        pid: { type: 'long' },
        entity_id: { type: 'keyword' },
        executable: { type: 'keyword' },
      },
    },
  },
});

/**
 * The pipeline every seeded raw event passes through: `@timestamp` is coerced to
 * a date (the workflow's window filter needs a real date, not a string) and
 * `event.ingested` is stamped from ingest time.
 */
export const rawEventIngestPipeline = (): Record<string, unknown> => ({
  description:
    'Normalize seeded FP/TP raw events: a parseable @timestamp and an ingest-time event.ingested.',
  processors: [
    {
      date: {
        field: '@timestamp',
        formats: ['ISO8601'],
        on_failure: [
          {
            set: {
              field: '@timestamp',
              value: '{{{_ingest.timestamp}}}',
            },
          },
        ],
      },
    },
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
  ],
});

const esErrorType = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const body = (error as { meta?: { body?: { error?: { type?: string } } } }).meta?.body?.error;
  return body?.type;
};

/**
 * A name inside `logs-endpoint.events.*` cannot be a plain index: the generic
 * `logs` template (`logs-*-*`, data_stream) claims it and ES refuses a plain
 * create with `illegal_argument_exception`. The seeder therefore owns a
 * composable data-stream template for its own names and provisions each stream
 * through it.
 */
export const ensureFpTpRawEventTemplate = async (esClient: EsClient): Promise<void> => {
  await esClient.indices.putIndexTemplate({
    name: FP_TP_RAW_EVENT_INDEX_TEMPLATE,
    index_patterns: [`${FP_TP_RAW_EVENT_INDEX_PREFIX}*`],
    priority: FP_TP_RAW_EVENT_TEMPLATE_PRIORITY,
    // The composition supplies ECS types (host.os.type, event.action, host.ip,
    // data_stream.*, agent.*, ecs.version, ...) for fields this template maps
    // dynamically. Without it those fields land as text and detection rules
    // querying logs-endpoint.events.* fail verification with
    // "mapped as [2] incompatible types" — live incident: rule 8a1b0278
    // (SUID/SGID) never alerted on the golden serverless env. Explicit
    // mappings below win conflicts (a template's own mappings override its components).
    composed_of: ['logs@mappings', 'ecs@mappings'],
    data_stream: {},
    template: {
      settings: rawEventIndexSettings(),
      mappings: rawEventIndexMappings(),
    },
  });
};

/** Creates each seeded raw-event stream if it is missing. Idempotent. */
export const ensureFpTpRawEventIndices = async (
  esClient: EsClient,
  indexNames: readonly string[]
): Promise<void> => {
  for (const name of new Set(indexNames)) {
    await esClient.indices.createDataStream({ name }).catch((error) => {
      if (esErrorType(error) === 'resource_already_exists_exception') {
        return;
      }
      throw error;
    });
  }
};

/** Installs (or refreshes) the raw-event ingest pipeline. Idempotent. */
export const ensureFpTpRawEventPipeline = async (esClient: EsClient): Promise<void> => {
  await esClient.ingest.putPipeline({
    id: FP_TP_RAW_EVENT_INGEST_PIPELINE,
    ...rawEventIngestPipeline(),
  });
};

/**
 * Everything the raw-event write path needs: the template, the streams, and the
 * pipeline. Call once before seeding events; returns the pipeline id the bulk
 * call must attach.
 */
export const ensureFpTpRawEventStore = async (
  esClient: EsClient,
  indexNames: readonly string[]
): Promise<string> => {
  await ensureFpTpRawEventTemplate(esClient);
  await ensureFpTpRawEventIndices(esClient, indexNames);
  await ensureFpTpRawEventPipeline(esClient);
  return FP_TP_RAW_EVENT_INGEST_PIPELINE;
};

/** Distinct indices the seeded events target, in first-seen order. */
export const rawEventIndexNames = (events: ReadonlyArray<{ index: string }>): string[] => [
  ...new Set(events.map(({ index }) => index)),
];
