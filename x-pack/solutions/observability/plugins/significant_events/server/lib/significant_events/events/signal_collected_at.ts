/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalEntry } from '@kbn/significant-events-schema';

/** Returns the explicit collection time or the executed query's end for an unstamped signal. */
export const getSignalCollectedAt = (signal: SignalEntry): string | undefined =>
  signal.collected_at ?? signal.evidence?.time_range?.to;
