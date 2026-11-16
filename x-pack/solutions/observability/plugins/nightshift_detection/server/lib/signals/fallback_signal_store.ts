/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Logger as CoreLogger } from '@kbn/core-di';
import { ALERT_EVENTS_MAPPINGS } from '@kbn/alerting-v2-schemas';
import { createHash } from 'crypto';
import { inject, injectable } from 'inversify';
import {
  DETECTION_SIGNALS_FALLBACK_STREAM,
  detectionSignalSchema,
  type DetectionSignal,
} from '../../../common/detection_signal';
import { DetectionEngineSystemClient } from '../engine/es_client_tokens';
import type { DetectionSignalReading } from '../strategies/types';
import type { IDetectionSignalStore, IWriteSignalsResult } from './signal_store';

const RETENTION = '30d';
const INGEST_PIPELINE_ID = `${DETECTION_SIGNALS_FALLBACK_STREAM}-ingest-timestamp`;
const BUCKET_START_FIELD = 'signal.bucket_start';
/** One history read returns at most this many readings; a window is minutes of a few series. */
const MAX_HISTORY_READINGS = 10_000;

/**
 * One id per reading: the same series, strategy and bucket always map to the same document, so
 * writing a window again after a crash conflicts instead of duplicating the signal.
 */
function getSignalId(signal: DetectionSignal): string {
  return createHash('sha256')
    .update(`${signal.group_hash}:${signal.data.strategy}:${signal.data.bucket_start}`)
    .digest('hex');
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'body' in error &&
    JSON.stringify(error.body).includes('resource_already_exists_exception')
  );
}

/**
 * Detection signals in the engine's own data stream, written as the Kibana system user. `data`
 * is `flattened`, so the bucket start is read from `_source` by a runtime field, the approach of
 * the metric series reader in `significant_events`.
 *
 * The stream is installed here, with the system client, and not through `@kbn/data-streams`, for
 * two reasons. The package is private to the platform group, so a solutions plugin cannot import
 * it. The Core route (`core.dataStreams.registerDataStream`) is reachable, but Core installs
 * registered streams during its own start, where an Elasticsearch error would stop Kibana, and
 * the engine must not fail to start because of its signal store. The cost is that nothing here
 * upgrades the lifecycle or final pipeline of a stream that already exists.
 */
@injectable()
export class FallbackSignalStore implements IDetectionSignalStore {
  private ready: Promise<void> | undefined;

  constructor(
    @inject(DetectionEngineSystemClient) private readonly esClient: ElasticsearchClient,
    @inject(CoreLogger) private readonly logger: Logger
  ) {}

  /**
   * Resolves once the data stream and its ingest pipeline exist. Cheap after the first call. A
   * failure is logged and forgotten, so the next call retries it.
   */
  public ensureReady(): Promise<void> {
    if (!this.ready) {
      this.ready = this.install().catch((error) => {
        this.ready = undefined;
        this.logger.error(
          `Could not set up the ${DETECTION_SIGNALS_FALLBACK_STREAM} data stream: ${error.message}`
        );
        throw error;
      });
    }

    return this.ready;
  }

  /**
   * Writes the signals in one bulk call and reports the ones the stream rejected. A signal that
   * already exists (HTTP 409) was written by an earlier attempt, so it counts as written.
   */
  public async write(signals: DetectionSignal[]): Promise<IWriteSignalsResult> {
    if (signals.length === 0) {
      return { written: 0, failures: [] };
    }

    await this.ensureReady();
    const response = await this.esClient.bulk({
      index: DETECTION_SIGNALS_FALLBACK_STREAM,
      operations: signals.flatMap((signal) => [{ create: { _id: getSignalId(signal) } }, signal]),
    });

    const failures: IWriteSignalsResult['failures'] = [];
    response.items.forEach((item, index) => {
      const error = item.create?.error;
      if (error && item.create?.status !== 409) {
        failures.push({
          fingerprint: signals[index].data.fingerprint,
          reason: error.reason ?? error.type ?? 'unknown',
        });
      }
    });

    return { written: signals.length - failures.length, failures };
  }

  /** Reads one strategy's readings back, grouped by fingerprint, oldest first. */
  public async readHistory({
    spaceId,
    strategy,
    fingerprints,
    from,
    to,
  }: {
    spaceId: string;
    strategy: string;
    fingerprints: string[];
    from: number;
    to: number;
  }): Promise<Map<string, DetectionSignalReading[]>> {
    const history = new Map<string, DetectionSignalReading[]>();
    if (fingerprints.length === 0) {
      return history;
    }

    await this.ensureReady();
    const response = await this.esClient.search({
      index: DETECTION_SIGNALS_FALLBACK_STREAM,
      size: MAX_HISTORY_READINGS,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            { term: { type: 'signal' } },
            { term: { space_id: spaceId } },
            { term: { 'data.strategy': strategy } },
            { terms: { 'data.fingerprint': fingerprints } },
            { range: { [BUCKET_START_FIELD]: { gte: from, lt: to, format: 'epoch_millis' } } },
          ],
        },
      },
      sort: [{ [BUCKET_START_FIELD]: 'asc' }],
      runtime_mappings: {
        [BUCKET_START_FIELD]: {
          type: 'date',
          script: {
            source: `
              def start = params._source?.data?.bucket_start;
              if (start != null) { emit(((Number) start).longValue()); }
            `,
          },
        },
      },
    });

    const total =
      typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value;
    if (total !== undefined && total > MAX_HISTORY_READINGS) {
      // Sorted oldest first, so the newest readings are the ones left out.
      this.logger.warn(
        `History of ${strategy} in [${spaceId}] has ${total} readings; only the first ${MAX_HISTORY_READINGS} were read`
      );
    }

    for (const hit of response.hits.hits) {
      const parsed = detectionSignalSchema.safeParse(hit._source);
      if (!parsed.success) {
        // A document an older or newer build wrote in another shape must not fail the whole read;
        // the history is a baseline, and one reading missing from it is not worth stopping a run.
        this.logger.warn(`Skipped a stored signal that does not parse: ${parsed.error.message}`);
        continue;
      }

      const { strategy: _strategy, triage: _triage, ...reading } = parsed.data.data;
      const readings = history.get(reading.fingerprint) ?? [];
      readings.push({ status: parsed.data.status, ...reading });
      history.set(reading.fingerprint, readings);
    }

    return history;
  }

  private async install(): Promise<void> {
    // The template names the pipeline, so it has to exist first. Putting it again is a no-op.
    await this.esClient.ingest.putPipeline({
      id: INGEST_PIPELINE_ID,
      processors: [
        { set: { field: '@timestamp', value: '{{{_ingest.timestamp}}}', override: false } },
      ],
      _meta: { managed: true },
    });

    await this.esClient.indices.putIndexTemplate({
      name: DETECTION_SIGNALS_FALLBACK_STREAM,
      index_patterns: [DETECTION_SIGNALS_FALLBACK_STREAM],
      data_stream: { hidden: true },
      priority: 500,
      _meta: { managed: true, description: 'Nightshift detection engine signals' },
      template: {
        mappings: ALERT_EVENTS_MAPPINGS,
        lifecycle: { data_retention: RETENTION },
        settings: {
          // A single node cannot allocate a replica, which would leave the cluster yellow.
          'index.auto_expand_replicas': '0-1',
          'index.final_pipeline': INGEST_PIPELINE_ID,
        },
      },
    });

    try {
      await this.esClient.indices.createDataStream({ name: DETECTION_SIGNALS_FALLBACK_STREAM });
    } catch (error) {
      // Another Kibana node, or an earlier start, created it.
      if (!isAlreadyExistsError(error)) {
        throw error;
      }

      await this.updateMappings();
    }
  }

  /** Brings an existing stream's write index up to the shared mappings; best effort. */
  private async updateMappings(): Promise<void> {
    try {
      await this.esClient.indices.putMapping({
        index: DETECTION_SIGNALS_FALLBACK_STREAM,
        properties: ALERT_EVENTS_MAPPINGS.properties,
      });
    } catch (error) {
      // New documents are still stored with the old mapping; the next rollover picks up the
      // template.
      this.logger.warn(
        `Could not update the mappings of ${DETECTION_SIGNALS_FALLBACK_STREAM}: ${error.message}`
      );
    }
  }
}
