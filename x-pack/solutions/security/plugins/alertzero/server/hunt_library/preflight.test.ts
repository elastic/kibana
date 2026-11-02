/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  checkExecutionRetention,
  checkFingerprintKey,
  computeFingerprintKeyCheck,
  isFingerprintKeyMismatch,
  runHuntLibraryPreflight,
} from './preflight';

const DAY = 86_400_000;
const KEY = 'k'.repeat(32);

describe('checkExecutionRetention', () => {
  it('passes with no expiry and at or above the 90 day minimum', () => {
    expect(checkExecutionRetention({ retentionMs: null })).toEqual({
      ok: true,
      retentionDays: null,
    });
    expect(checkExecutionRetention({ retentionMs: 90 * DAY })).toEqual({
      ok: true,
      retentionDays: 90,
    });
    expect(checkExecutionRetention({ retentionMs: 400 * DAY }).ok).toBe(true);
  });

  it('fails below the minimum', () => {
    expect(checkExecutionRetention({ retentionMs: 89 * DAY })).toEqual({
      ok: false,
      retentionDays: 89,
      reason: 'retention_below_minimum',
    });
    expect(checkExecutionRetention({ retentionMs: 12 * 3_600_000 }).ok).toBe(false);
  });
});

describe('fingerprint key', () => {
  it('reports a missing key without exposing anything', () => {
    expect(checkFingerprintKey({ fingerprintKeyVersion: 'v1' })).toEqual({
      ok: false,
      version: 'v1',
      reason: 'fingerprint_key_missing',
    });
    expect(checkFingerprintKey({ fingerprintKey: '', fingerprintKeyVersion: 'v1' }).ok).toBe(false);
  });

  it('records only the version and a short non-secret check value', () => {
    const result = checkFingerprintKey({ fingerprintKey: KEY, fingerprintKeyVersion: 'v1' });

    expect(result).toEqual({
      ok: true,
      version: 'v1',
      keyCheck: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
    expect(JSON.stringify(result)).not.toContain(KEY);
  });

  it('derives a stable check value that changes with the key', () => {
    expect(computeFingerprintKeyCheck(KEY)).toBe(computeFingerprintKeyCheck(KEY));
    expect(computeFingerprintKeyCheck(KEY)).not.toBe(computeFingerprintKeyCheck('j'.repeat(32)));
  });

  it('detects a mismatch only against a recorded version and check value', () => {
    const current = {
      ok: true as const,
      version: 'v1',
      keyCheck: computeFingerprintKeyCheck(KEY),
    };

    expect(isFingerprintKeyMismatch(current, undefined)).toBe(false);
    expect(isFingerprintKeyMismatch(current, { version: 'v1', keyCheck: current.keyCheck })).toBe(
      false
    );
    expect(
      isFingerprintKeyMismatch(current, {
        version: 'v1',
        keyCheck: computeFingerprintKeyCheck('j'.repeat(32)),
      })
    ).toBe(true);
    expect(isFingerprintKeyMismatch(current, { version: 'v2', keyCheck: current.keyCheck })).toBe(
      true
    );
  });
});

describe('runHuntLibraryPreflight', () => {
  it('logs an error for each failed check and still resolves', async () => {
    const logger = loggerMock.create();

    const result = await runHuntLibraryPreflight({
      config: { fingerprintKeyVersion: 'v1' },
      getExecutionRetention: async () => ({ retentionMs: 30 * DAY }),
      logger,
    });

    expect(result.retention.ok).toBe(false);
    expect(result.fingerprintKey.ok).toBe(false);
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it('is silent when both checks pass', async () => {
    const logger = loggerMock.create();

    const result = await runHuntLibraryPreflight({
      config: { fingerprintKey: KEY, fingerprintKeyVersion: 'v1' },
      getExecutionRetention: async () => ({ retentionMs: null }),
      logger,
    });

    expect(result.retention.ok && result.fingerprintKey.ok).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
