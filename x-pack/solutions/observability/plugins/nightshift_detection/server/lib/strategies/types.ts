/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import type { NightshiftSource } from '@kbn/nightshift-shared';

/** What a strategy declares about itself; the engine reads it to schedule the strategy. */
export interface DetectionStrategyDescriptor {
  /** Stable id, unique in the catalog. Stamped on every signal the strategy produces. */
  id: string;
  /**
   * Bump it when the strategy's logic changes what a reading means. The engine stamps it on every
   * signal, so history written by an older version stays distinguishable.
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
export interface DetectionSignalReading {
  /** `recovered` and `no_data` are reported as readings too, not only `breached`. */
  status: 'breached' | 'recovered' | 'no_data';
  /** Identifies the series within the strategy; the engine hashes it into the group hash. */
  fingerprint: string;
  rule_id?: string;
  source_id?: string;
  entity: { type: string; name: string };
  /** Start of the bucket, in epoch milliseconds. */
  bucket_start: number;
  /** End of the bucket, in epoch milliseconds. */
  bucket_end: number;
  value: number;
  unit: string;
  title: string;
  description: string;
  /** 0 to 100. */
  importance: number;
  /** The ES|QL query that reproduces the reading. */
  evidence_esql: string;
  /** A supporting reading may join an open event but never opens one. */
  role: 'primary' | 'supporting';
  /** Whether the judge should compare the reading with what is normal for the series. */
  compare_with_normal: boolean;
  /** Strategy-specific detail, kept as reported. */
  details: Record<string, unknown>;
}

/** Reads back the readings a strategy wrote before, so a generator can compare with its history. */
export interface SignalHistoryReader {
  /**
   * Readings of the calling strategy only, for the given series, whose bucket starts in
   * `[from, to)` (epoch milliseconds), grouped by fingerprint. A fingerprint without readings is
   * absent from the result.
   */
  readHistory(params: {
    fingerprints: string[];
    from: number;
    to: number;
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
