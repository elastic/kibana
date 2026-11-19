/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import {
  DETECTION_SIGNAL_SOURCE,
  detectionSignalSchema,
  type DetectionSignal,
} from '../../../common/detection_signal';
import type { DetectionSignalReading } from '../strategies/types';

/** The group hash of `alerting_v2`, so a series keeps its identity when signals move to `.rule-events`. */
function getGroupHash({
  spaceId,
  source,
  fingerprint,
}: {
  spaceId: string;
  source: string;
  fingerprint: string;
}): string {
  return createHash('sha256').update(`${spaceId}:${source}:${fingerprint}`).digest('hex');
}

/**
 * The fingerprint Alerting v2 hashes into the group hash: the series identity of #2072, a
 * reading's fingerprint within its strategy and its source. A fingerprint is unique within its
 * strategy only, and the source is part of the key so that two sources with a series of the same
 * name never share a baseline. Changing this formula splits every stored series.
 * Hashed so ids that contain the separator can't collide, and so the length fits Alerting v2's
 * fingerprint limit whatever the parts are; Alerting v2 stores only the group hash.
 */
export function getSeriesFingerprint({
  strategy,
  source_id: sourceId,
  fingerprint,
}: {
  strategy: string;
  source_id?: string;
  fingerprint: string;
}): string {
  return createHash('sha256')
    .update(JSON.stringify([strategy, sourceId ?? null, fingerprint]))
    .digest('hex');
}

/** A wrapped reading, or the note that says why it was dropped. */
export type WrapReadingResult =
  | { dropped: false; signal: DetectionSignal }
  | { dropped: true; note: string };

/**
 * Wraps a generator's reading into the signal that is stored: the engine adds what the
 * generator does not know (strategy, space, group hash, schedule) and validates the result.
 *
 * @param scheduledMinute The minute the run is for, in epoch milliseconds.
 */
export function wrapReading({
  reading,
  strategyId,
  strategyVersion,
  spaceId,
  scheduledMinute,
}: {
  reading: DetectionSignalReading;
  strategyId: string;
  strategyVersion: number;
  spaceId: string;
  scheduledMinute: number;
}): WrapReadingResult {
  const { status, severity, ...data } = reading;

  const parsed = detectionSignalSchema.safeParse({
    ...(severity !== undefined ? { severity } : {}),
    scheduled_timestamp: new Date(scheduledMinute).toISOString(),
    group_hash: getGroupHash({
      spaceId,
      source: DETECTION_SIGNAL_SOURCE,
      fingerprint: getSeriesFingerprint({ ...reading, strategy: strategyId }),
    }),
    status,
    source: DETECTION_SIGNAL_SOURCE,
    type: 'signal',
    space_id: spaceId,
    data: { ...data, strategy: strategyId, strategy_version: strategyVersion },
  });

  if (!parsed.success) {
    return {
      dropped: true,
      note: `${strategyId}: dropped reading ${reading.fingerprint}: ${parsed.error.issues
        .map(({ path, message }) => `${path.join('.')}: ${message}`)
        .join('; ')}`,
    };
  }

  return { dropped: false, signal: parsed.data };
}
