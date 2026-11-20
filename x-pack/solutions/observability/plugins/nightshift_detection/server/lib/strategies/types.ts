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
import type { KnowledgeIndicatorReader } from '@kbn/significant-events-plugin/server';
import type { z } from '@kbn/zod/v4';
import type { detectionSignalReadingSchema } from '../../../common/detection_signal';
import type { ManagedRuleReader } from '../rules/managed_rule_reader';
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
  /** The space's knowledge indicators, read as the detection service account, once per tick. */
  knowledge: KnowledgeIndicatorReader;
  /** The engine's managed rules in the space, and the rows they wrote. */
  rules: Pick<ManagedRuleReader, 'listManaged' | 'readRows'>;
  /** Whether cross-project search is on, so a strategy builds the same rule queries as its resources. */
  cpsEnabled: boolean;
  /** Aborted when the run is out of time or cancelled; long queries should stop on it. */
  abortSignal: AbortSignal;
  logger: Logger;
}

/** What a generator reports for one window. */
export interface GenerateResult {
  /**
   * A reading for every series evaluated in every bucket of the window, breaching or not. A strategy
   * may report breaches only instead, and then sets `quiet_period_minutes` on them.
   */
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

/**
 * An Alerting v2 rule a strategy wants to exist. The engine owns its identity: it derives the rule
 * id from the space, strategy, source and query, adds its ownership tags and prefixes the name.
 */
export interface AlertingRuleResource {
  kind: 'alerting_rule';
  source_id: string;
  /** Whether the rule should run; false for the rules of a disabled source. */
  enabled: boolean;
  /**
   * The rule as created. `metadata.name` is the strategy's title for it, without the prefix. No
   * tags: the engine's are its ownership record, and `nightshift:source:*` belongs to
   * significant_events, which deletes those rules.
   */
  data: Omit<CreateRuleData, 'metadata'> & {
    metadata: Omit<CreateRuleData['metadata'], 'tags'>;
  };
}

/**
 * Something a strategy needs to exist outside the engine, tagged by `kind`. One kind for now; the
 * union grows when a strategy needs another (an ML job, a connector check).
 */
export type DesiredResource = AlertingRuleResource;

/** The resources a strategy needs, and the sources it cannot watch. */
export interface DesiredResources {
  resources: DesiredResource[];
  skipped: Array<{ source_id: string; reason: string }>;
}

/** What building a strategy's resources needs. */
export interface ResourceContext
  extends Pick<GeneratorContext, 'spaceId' | 'esClient' | 'abortSignal'> {
  /**
   * Every source of the space, enabled or not, so a strategy keeps a disabled source's rules,
   * disabled, instead of leaving them out and having them deleted.
   */
  sources: NightshiftSource[];
  /** The space's knowledge indicators, read as the detection service account. */
  knowledge: KnowledgeIndicatorReader;
  /** Whether cross-project search is on, so queries carry the project routing prefix. */
  cpsEnabled: boolean;
}
