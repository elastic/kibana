/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { Logger as CoreLogger, PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import {
  DETECTION_SIGNAL_SOURCE,
  storedDetectionSignalSchema,
  type DetectionSignal,
} from '../../../common/detection_signal';
import { DetectionEngineSystemClient } from '../engine/es_client_tokens';
import { getSeriesKey, type SeriesId } from '../strategies/series_key';
import type { DetectionSignalReading } from '../strategies/types';
import type { DetectionSignalStore, WriteSignalsResult } from './signal_store';
import { getSeriesFingerprint } from './wrap_reading';

const BUCKET_START_FIELD = 'signal.bucket_start';
/** One history read returns at most this many readings, the newest. */
const MAX_HISTORY_READINGS = 10_000;
/** Signals written at the same time; Alerting v2 takes one signal per call. */
const WRITE_CONCURRENCY = 10;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Detection signals in `.rule-events`, written through Alerting v2's `createSignalEvent` and read
 * back with the engine's system client. Alerting v2 owns the data stream, its template and its
 * retention; this store installs nothing.
 *
 * A write has no document id, so a window read again after a crash stores its signals twice. The
 * read counts a reading once per series and bucket start, which makes that harmless.
 */
@injectable()
export class RuleEventsSignalStore implements DetectionSignalStore {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(PluginStart<AlertingServerStart>('alertingVTwo'))
    private readonly alerting: AlertingServerStart,
    @inject(PluginStart<SpacesPluginStart>('spaces')) private readonly spaces: SpacesPluginStart,
    @inject(DetectionEngineSystemClient) private readonly esClient: ElasticsearchClient,
    @inject(CoreLogger) private readonly logger: Logger
  ) {}

  /**
   * Writes the signals, at most {@link WRITE_CONCURRENCY} at a time, and reports the ones that
   * failed. Alerting v2 stores a signal in the space of the request, so a batch with a signal of
   * another space is refused before anything is written. A signal stored under another series
   * than the one it was wrapped for still counts as failed, as a last check.
   */
  public async write(signals: DetectionSignal[]): Promise<WriteSignalsResult> {
    const failures: WriteSignalsResult['failures'] = [];
    if (signals.length === 0) {
      return { written: 0, failures };
    }

    const failAll = (reason: string): WriteSignalsResult => ({
      written: 0,
      failures: signals.map((signal) => ({ fingerprint: signal.data.fingerprint, reason })),
    });

    let requestSpaceId: string;
    let client: Awaited<ReturnType<AlertingServerStart['getAlertEventsClientWithRequest']>>;
    try {
      requestSpaceId = this.spaces.spacesService.getSpaceId(this.request);
      client = await this.alerting.getAlertEventsClientWithRequest(this.request);
    } catch (error) {
      // The run reports failures per signal; a throw here would lose the batch's list.
      return failAll(`could not reach Alerting v2: ${getErrorMessage(error)}`);
    }

    if (signals.some((signal) => signal.space_id !== requestSpaceId)) {
      return failAll(`the request is in space ${requestSpaceId}, and a signal of the batch is not`);
    }

    for (let start = 0; start < signals.length; start += WRITE_CONCURRENCY) {
      const batch = signals.slice(start, start + WRITE_CONCURRENCY);
      const reasons = await Promise.all(
        batch.map(async (signal) => {
          try {
            const { group_hash: groupHash } = await client.createSignalEvent({
              source: signal.source,
              fingerprint: getSeriesFingerprint(signal.data),
              status: signal.status,
              severity: signal.severity,
              timestamp: signal.scheduled_timestamp,
              data: signal.data,
            });

            return groupHash === signal.group_hash
              ? undefined
              : `stored in series ${groupHash}, not ${signal.group_hash}: the request is not in the space of the signal`;
          } catch (error) {
            return getErrorMessage(error);
          }
        })
      );

      reasons.forEach((reason, index) => {
        if (reason !== undefined) {
          failures.push({ fingerprint: batch[index].data.fingerprint, reason });
        }
      });
    }

    return { written: signals.length - failures.length, failures };
  }

  /** Reads one strategy's readings back, keyed by series, oldest first. */
  public async readHistory({
    spaceId,
    strategy,
    strategyVersion,
    series,
    from,
    to,
    abortSignal,
  }: {
    spaceId: string;
    strategy: string;
    strategyVersion: number;
    series: SeriesId[];
    from: number;
    to: number;
    abortSignal?: AbortSignal;
  }): Promise<Map<string, DetectionSignalReading[]>> {
    const history = new Map<string, DetectionSignalReading[]>();
    if (series.length === 0) {
      return history;
    }

    const requestedSeries = new Set(series.map(getSeriesKey));
    const fingerprints = [...new Set(series.map(({ fingerprint }) => fingerprint))];

    // `data` is `flattened`, so the bucket start is read from `_source` by a runtime field, the
    // approach of the metric series reader in `significant_events`.
    const response = await this.esClient.search(
      {
        index: ALERT_EVENTS_DATA_STREAM,
        size: MAX_HISTORY_READINGS,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              { term: { type: 'signal' } },
              { term: { source: DETECTION_SIGNAL_SOURCE } },
              { term: { space_id: spaceId } },
              // A reading is written after its bucket starts, so this indexed bound never leaves one
              // out, and it spares the runtime field every document older than the window.
              { range: { scheduled_timestamp: { gte: from, format: 'epoch_millis' } } },
              { term: { 'data.strategy': strategy } },
              { term: { 'data.strategy_version': strategyVersion } },
              // A fingerprint can match the series of another source; those are dropped below.
              { terms: { 'data.fingerprint': fingerprints } },
              { range: { [BUCKET_START_FIELD]: { gte: from, lt: to, format: 'epoch_millis' } } },
            ],
          },
        },
        // Newest first, so a read that hits the limit keeps the most recent baseline.
        sort: [{ [BUCKET_START_FIELD]: 'desc' }],
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
      },
      { signal: abortSignal }
    );

    const total =
      typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value;
    if (total !== undefined && total > MAX_HISTORY_READINGS) {
      // Sorted newest first, so the oldest readings are the ones left out.
      this.logger.warn(
        `History of ${strategy} in [${spaceId}] has ${total} readings; only the newest ${MAX_HISTORY_READINGS} were read`
      );
    }

    // A window written twice stores each of its signals twice.
    const seen = new Set<string>();
    const skipped: string[] = [];

    // Back to oldest first.
    for (const hit of [...response.hits.hits].reverse()) {
      const parsed = storedDetectionSignalSchema.safeParse(hit._source);
      if (!parsed.success) {
        // A document an older or newer build wrote in another shape must not fail the whole read;
        // the history is a baseline, and one reading missing from it is not worth stopping a run.
        skipped.push(parsed.error.message);
        continue;
      }

      const {
        strategy: _strategy,
        strategy_version: _strategyVersion,
        ...reading
      } = parsed.data.data;

      const seriesKey = getSeriesKey(reading);
      if (!requestedSeries.has(seriesKey)) {
        continue;
      }

      const key = `${parsed.data.group_hash}:${reading.bucket_start}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const readings = history.get(seriesKey) ?? [];
      const { status, severity } = parsed.data;
      readings.push({ status, ...(severity !== undefined ? { severity } : {}), ...reading });
      history.set(seriesKey, readings);
    }

    if (skipped.length > 0) {
      // Once per read: every run reads again, so a warning per document would flood the log.
      this.logger.warn(
        `Skipped ${skipped.length} stored signals of ${strategy} in [${spaceId}] that do not parse; the first: ${skipped[0]}`
      );
    }

    return history;
  }
}
