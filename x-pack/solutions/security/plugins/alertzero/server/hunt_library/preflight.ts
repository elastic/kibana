/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';
import type { Logger } from '@kbn/core/server';

/** Hunt Library run history lives in workflow executions, so they must outlive this window. */
export const MIN_EXECUTION_RETENTION_DAYS = 90;
const MS_PER_DAY = 86_400_000;

const KEY_CHECK_CONTEXT = 'alertzero.hunt_library.fingerprint_key_check';
const KEY_CHECK_HEX_LENGTH = 16;

export type RetentionPreflight =
  | { ok: true; retentionDays: number | null }
  | { ok: false; retentionDays: number; reason: 'retention_below_minimum' };

export type FingerprintKeyPreflight =
  | { ok: true; version: string; keyCheck: string }
  | { ok: false; version: string; reason: 'fingerprint_key_missing' };

export interface HuntLibraryPreflight {
  retention: RetentionPreflight;
  fingerprintKey: FingerprintKeyPreflight;
}

/** `retentionMs: null` means nothing expires executions, which always satisfies the minimum. */
export const checkExecutionRetention = (retention: {
  retentionMs: number | null;
}): RetentionPreflight => {
  if (retention.retentionMs === null) {
    return { ok: true, retentionDays: null };
  }
  const retentionDays = retention.retentionMs / MS_PER_DAY;
  return retentionDays >= MIN_EXECUTION_RETENTION_DAYS
    ? { ok: true, retentionDays }
    : { ok: false, retentionDays, reason: 'retention_below_minimum' };
};

/**
 * A non-secret, non-reversible check value derived from the key. Recorded next to the key version
 * so a changed key under an unchanged version is detectable without storing the key.
 */
export const computeFingerprintKeyCheck = (fingerprintKey: string): string =>
  createHmac('sha256', fingerprintKey)
    .update(KEY_CHECK_CONTEXT)
    .digest('hex')
    .slice(0, KEY_CHECK_HEX_LENGTH);

export const checkFingerprintKey = (config: {
  fingerprintKey?: string;
  fingerprintKeyVersion: string;
}): FingerprintKeyPreflight =>
  config.fingerprintKey
    ? {
        ok: true,
        version: config.fingerprintKeyVersion,
        keyCheck: computeFingerprintKeyCheck(config.fingerprintKey),
      }
    : { ok: false, version: config.fingerprintKeyVersion, reason: 'fingerprint_key_missing' };

/**
 * Compares the configured key with the version and check value recorded when the worker was first
 * enabled. With nothing recorded yet there is nothing to mismatch.
 */
export const isFingerprintKeyMismatch = (
  current: Extract<FingerprintKeyPreflight, { ok: true }>,
  recorded: { version: string; keyCheck: string } | undefined
): boolean =>
  recorded !== undefined &&
  (recorded.version !== current.version || recorded.keyCheck !== current.keyCheck);

export const runHuntLibraryPreflight = async ({
  config,
  getExecutionRetention,
  logger,
}: {
  config: { fingerprintKey?: string; fingerprintKeyVersion: string };
  getExecutionRetention: () => Promise<{ retentionMs: number | null }>;
  logger: Logger;
}): Promise<HuntLibraryPreflight> => {
  const retention = checkExecutionRetention(await getExecutionRetention());
  const fingerprintKey = checkFingerprintKey(config);

  if (!retention.ok) {
    logger.error(
      `Hunt Library requires at least ${MIN_EXECUTION_RETENTION_DAYS} days of workflow execution retention, found ${retention.retentionDays}. Library Hunt worker enablement is refused until retention is raised.`
    );
  }
  if (!fingerprintKey.ok) {
    logger.error(
      'Hunt Library fingerprint key is not configured (xpack.alertzero.huntLibrary.fingerprintKey). Library Hunt worker enablement and sweeps are blocked.'
    );
  }
  return { retention, fingerprintKey };
};
