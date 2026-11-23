/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  AlertEventSeverity,
  AlertEventStatus,
  CreateRuleData,
} from '@kbn/alerting-v2-schemas';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { z } from '@kbn/zod/v4';
import type { detectionSignalReadingSchema } from '../../../common/detection_signal';
import type { SeriesId } from './series_key';

/** What a strategy declares about itself; the engine reads it to schedule the strategy. */
export interface DetectionStrategyDescriptor {
  /** Stable id, unique in the catalog. Stamped on every signal the strategy produces. */
  id: string;
  /**
   * Bump it when the strategy's logic changes what a reading means. The engine stamps it on every
   * signal, so history written by an older version stays distinguishable.
   * A bump costs a baseline: the history read leaves older versions out, so every series of the
   * strategy is `warming_up` until it has enough readings again, and nothing that compares with
   * normal opens an event meanwhile. Don't bump it for a change that keeps the value comparable.
   */
  version: number;
  name: string;
  description: string;
  /** The strategy runs once per this many minutes. */
  cadence_minutes: number;
  /** Minutes to wait after a bucket ends before reading it, so late data has arrived. */
  settle_minutes: number;
  /** Most new significant events the strategy may open per day. */
  daily_new_event_cap: number;
}

/**
 * What a generator reports for one series in one bucket. The engine wraps it into a
 * `DetectionSignal`: it adds the strategy id, space, group hash and schedule time, so a reading
 * carries only what the generator knows.
 */
export type DetectionSignalReading = z.infer<typeof detectionSignalReadingSchema> & {
  /** `recovered` and `no_data` are reported as readings too, not only `breached`. */
  status: AlertEventStatus;
  /** A severity decided outside the engine, such as an external alert's; most strategies omit it. */
  severity?: AlertEventSeverity;
};

/** Reads back the readings a strategy wrote before, so a generator can compare with its history. */
export interface SignalHistoryReader {
  /**
   * Readings of the calling strategy only, for the given series, whose bucket starts in
   * `[from, to)` (epoch milliseconds), keyed by `getSeriesKey`. A series without readings
   * is absent from the result.
   */
  readHistory(params: {
    series: SeriesId[];
    from: number;
    to: number;
    /** Stops the search when the run is out of time or cancelled. */
    abortSignal?: AbortSignal;
  }): Promise<Map<string, DetectionSignalReading[]>>;
}

/** What every generator run gets. */
export interface GeneratorContext {
  spaceId: string;
  /** Enabled sources; a strategy watches only what the admin chose. */
  sources: NightshiftSource[];
  /** Settled window to cover, `[from, to)` in epoch milliseconds, on minute boundaries. */
  window: { from: number; to: number };
  /** Reads customer data as the space's detection service account. */
  esClient: ElasticsearchClient;
  /** The strategy's own history. */
  history: SignalHistoryReader;
  /** Aborted when the run is out of time or cancelled; long queries should stop on it. */
  abortSignal: AbortSignal;
  logger: Logger;
}

/** What a generator reports for one window. */
export interface GenerateResult {
  /** A reading for every series evaluated in every bucket of the window, breaching or not. */
  readings: DetectionSignalReading[];
  /** Things the generator could not do, such as a source without the fields it needs. */
  notes: string[];
  /** True when reading stopped at a cap, so the window is only partly covered. */
  truncated: boolean;
}

/** Produces the readings of a detection strategy. */
export interface DetectionSignalGenerator {
  /** Reads the window and reports what it found. */
  generate(context: GeneratorContext): Promise<GenerateResult>;
}

/** An alerting rule the engine wants to exist for a strategy. */
export interface DesiredRule {
  source_id: string;
  data: CreateRuleData;
  /** What the generator needs to read the rule's rows back, such as the condition used. */
  meta?: Record<string, string>;
}

/** The rules a strategy needs, and the sources it cannot watch. */
export interface DesiredRules {
  rules: DesiredRule[];
  skipped: Array<{ source_id: string; reason: string }>;
}

/** What building a strategy's rules needs. */
export type DesiredRulesContext = Pick<
  GeneratorContext,
  'spaceId' | 'sources' | 'esClient' | 'abortSignal'
>;
