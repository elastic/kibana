/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import moment from 'moment';
import { parseDurationToMs } from '../../infra/time';
import type {
  CcsLogExtractionState,
  EngineLogExtractionState,
  LogExtractionConfig,
} from '../saved_objects';

export const WINDOW_CAP_GRACE_PERIOD_MS = 30_000;

/** `now - delay`. Upper bound of all data eligible to be processed in this cycle. */
export const computeEffectiveWindowEnd = (delay: string): string =>
  moment().utc().subtract(parseDurationToMs(delay), 'millisecond').toISOString();

/** `now - lookbackPeriod`. Fallback start when no resume point is persisted. */
export const computeLookbackStart = (lookbackPeriod: string): string =>
  moment().utc().subtract(parseDurationToMs(lookbackPeriod), 'millisecond').toISOString();

/** Throws if `from > to`. Used to surface clock skew / corrupted resume state. */
export const validateExtractionWindow = (fromDateISO: string, toDateISO: string): void => {
  if (moment(fromDateISO).isAfter(moment(toDateISO))) {
    throw new Error(`From ${fromDateISO} date is after to ${toDateISO} date`);
  }
};

export interface MainExtractionWindow {
  fromDateISO: string;
  effectiveWindowEnd: string;
}

/**
 * Window for the main (non-CCS) extraction path.
 *
 * Resume order: persisted entity-pagination cursor (`paginationTimestamp`) → last completed cycle
 * (`lastExecutionTimestamp`) → lookback fallback. The boundary probe in each new run re-establishes
 * the raw-log slice from the time range; the persisted log-slice start is consulted only after the
 * first slice of this run completes (handled by the caller, not here).
 */
export const resolveMainExtractionWindow = ({
  config,
  engineState,
}: {
  config: Pick<LogExtractionConfig, 'lookbackPeriod' | 'delay'>;
  engineState: Pick<EngineLogExtractionState, 'paginationTimestamp' | 'lastExecutionTimestamp'>;
}): MainExtractionWindow => {
  const fromDateISO =
    engineState.paginationTimestamp ||
    engineState.lastExecutionTimestamp ||
    computeLookbackStart(config.lookbackPeriod);
  const effectiveWindowEnd = computeEffectiveWindowEnd(config.delay);
  return { fromDateISO, effectiveWindowEnd };
};

export interface CcsExtractionWindow {
  effectiveFromDateISO: string;
  effectiveWindowEnd: string;
  recoveryId: string | undefined;
  isWindowOverride: boolean;
}

/**
 * Window for the CCS extraction path.
 *
 * Resume order: explicit `windowOverride` → mid entity-page recovery (`paginationRecoveryId` +
 * `checkpointTimestamp`) → slice-boundary recovery (`checkpointTimestamp` only) → lookback fallback.
 * Logs context for each branch so lagging / recovering CCS state is observable.
 */
export const resolveCcsExtractionWindow = ({
  config,
  ccsState,
  windowOverride,
  logger,
}: {
  config: Pick<LogExtractionConfig, 'lookbackPeriod' | 'delay'>;
  ccsState: Pick<CcsLogExtractionState, 'checkpointTimestamp' | 'paginationRecoveryId'>;
  windowOverride?: { fromDateISO: string; toDateISO: string };
  logger: Logger;
}): CcsExtractionWindow => {
  if (windowOverride != null) {
    return {
      effectiveFromDateISO: windowOverride.fromDateISO,
      effectiveWindowEnd: windowOverride.toDateISO,
      recoveryId: undefined,
      isWindowOverride: true,
    };
  }

  const effectiveWindowEnd = computeEffectiveWindowEnd(config.delay);

  if (ccsState.paginationRecoveryId && ccsState.checkpointTimestamp) {
    const effectiveFromDateISO = ccsState.checkpointTimestamp;
    const recoveryId = ccsState.paginationRecoveryId;
    logger.warn(
      `CCS extraction resuming from broken state: checkpointTimestamp=${effectiveFromDateISO}, paginationRecoveryId=${recoveryId}`
    );
    return { effectiveFromDateISO, effectiveWindowEnd, recoveryId, isWindowOverride: false };
  }

  if (ccsState.checkpointTimestamp) {
    logger.debug(
      `CCS extraction resuming after slice boundary: checkpointTimestamp=${ccsState.checkpointTimestamp}`
    );
    return {
      effectiveFromDateISO: ccsState.checkpointTimestamp,
      effectiveWindowEnd,
      recoveryId: undefined,
      isWindowOverride: false,
    };
  }

  if (ccsState.paginationRecoveryId && !ccsState.checkpointTimestamp) {
    logger.error(
      `CCS extraction can't be resumed from broken state because checkpointTimestamp is null (recovery id is present), defaulting to lookback period`
    );
  }

  const effectiveFromDateISO = computeLookbackStart(config.lookbackPeriod);
  logger.debug(`CCS extraction starting fresh: fromDateISO=${effectiveFromDateISO}`);
  return {
    effectiveFromDateISO,
    effectiveWindowEnd,
    recoveryId: undefined,
    isWindowOverride: false,
  };
};

export interface CappedExtractionWindow {
  toDateISO: string;
  isCapped: boolean;
}

/**
 * Caps the extraction sub-window end so that probe cost stays bounded in lagging environments.
 *
 * Returns `effectiveWindowEnd` unchanged when the gap from `fromDateISO` is within
 * `maxTimeWindowSize + GRACE_PERIOD`. Otherwise returns `fromDateISO + maxTimeWindowSize` and
 * sets `isCapped = true`. Logs an info line when capping engages so lagging environments are
 * observable in operations.
 */
export const capExtractionWindowEnd = ({
  fromDateISO,
  effectiveWindowEnd,
  maxTimeWindowSize,
  logger,
}: {
  fromDateISO: string;
  effectiveWindowEnd: string;
  maxTimeWindowSize: string;
  logger: Logger;
}): CappedExtractionWindow => {
  const fromMs = moment(fromDateISO).valueOf();
  const effectiveEndMs = moment(effectiveWindowEnd).valueOf();
  const maxWindowSizeMs = parseDurationToMs(maxTimeWindowSize);
  const widthMs = effectiveEndMs - fromMs;

  if (widthMs <= maxWindowSizeMs + WINDOW_CAP_GRACE_PERIOD_MS) {
    return { toDateISO: effectiveWindowEnd, isCapped: false };
  }

  const cappedEnd = moment(fromMs + maxWindowSizeMs)
    .utc()
    .toISOString();
  logger.info(
    `Extraction sub-window capped: from=${fromDateISO}, to=${cappedEnd}, effectiveEnd=${effectiveWindowEnd}, behind=${
      widthMs - maxWindowSizeMs
    }ms`
  );
  return { toDateISO: cappedEnd, isCapped: true };
};
