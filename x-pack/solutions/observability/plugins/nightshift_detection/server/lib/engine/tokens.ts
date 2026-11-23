/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createToken } from '@kbn/core-di';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { KnowledgeIndicatorReader } from '@kbn/significant-events-plugin/server';

/** What identifies one tick. */
export interface RunContext {
  /** The space the tick runs in; its run lock, state and signals are this space's. */
  spaceId: string;
  /** Unique per tick; reported back and stamped on what the run records. */
  runId: string;
  /**
   * The minute the tick runs in, in epoch milliseconds. Stamped on every signal as its schedule
   * time. It is the run's time, not the window's: history reads filter and order by it, so a window
   * replayed after a failure must carry the later minute to win over its first attempt.
   */
  scheduledMinute: number;
}

/** The tick's identity. Bound per tick scope: by the `_tick` route from the request, by tests directly. */
export const RunContext = createToken<RunContext>('nightshiftDetection.RunContext');

/** The sources of the scope's space. */
export interface Sources {
  /**
   * The space's sources, enabled and disabled, or only the ones the admin enabled. Throws when the
   * space has more sources than one read returns.
   */
  list(params: { enabledOnly: boolean }): Promise<NightshiftSource[]>;
}

/**
 * Reads the space's sources. Bound per account scope, because the sources client of
 * `nightshift_sources` is built from the request.
 */
export const Sources = createToken<Sources>('nightshiftDetection.Sources');

/**
 * The space's knowledge indicators, read as the detection service account. Bound per scope, because
 * the reader of `significant_events` is built from the request.
 */
export const KnowledgeIndicators = createToken<KnowledgeIndicatorReader>(
  'nightshiftDetection.KnowledgeIndicators'
);

/**
 * The engine's own Elasticsearch client: `asInternalUser` (the kibana_system user). Every read
 * and write on `.nightshift-detection_engine-*` goes through it, so the indices stay writable
 * without giving the detection service account any privilege on them.
 *
 * No service takes a client from `core` directly; it asks for this token or for
 * {@link DetectionEngineDataClient}.
 */
export const DetectionEngineSystemClient = createToken<ElasticsearchClient>(
  'nightshiftDetection.EngineSystemClient'
);

/**
 * Request-scoped client authenticated as the space's detection service account. Generators read
 * customer data with it, and it is the only client that touches customer indices.
 *
 * Bound per account scope, for a tick or a reconciliation; it is unbound outside one.
 */
export const DetectionEngineDataClient = createToken<ElasticsearchClient>(
  'nightshiftDetection.EngineDataClient'
);
