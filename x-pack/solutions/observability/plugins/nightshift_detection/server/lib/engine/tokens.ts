/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { NightshiftSource } from '@kbn/nightshift-shared';

/** What identifies one tick. */
export interface RunContext {
  /** The space the tick runs in; its run lock, state and signals are this space's. */
  spaceId: string;
  /** Unique per tick; reported back and stamped on what the run records. */
  runId: string;
  /** The minute the tick is for, in epoch milliseconds. Stamped on every signal as its schedule time. */
  scheduledMinute: number;
}

/** The tick's identity. Bound per tick scope: by the `_tick` route from the request, by tests directly. */
export const RunContext = createToken<RunContext>('nightshiftDetection.RunContext');

/** The sources the admin enabled for the tick's space. */
export interface EnabledSources {
  /** The sources enabled in the tick's space. */
  list(): Promise<NightshiftSource[]>;
}

/**
 * Reads the enabled sources. Bound per tick scope next to {@link RunContext}, because the sources
 * client of `nightshift_sources` is built from the request.
 */
export const EnabledSources = createToken<EnabledSources>('nightshiftDetection.EnabledSources');
