/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTrackingRefetchInterval, MAX_TRACKING_POLLING_MS, TRACKING_POLL_INTERVAL_MS } from '.';

describe('getTrackingRefetchInterval', () => {
  it('stops polling once both generation and validation tracking are present', () => {
    expect(
      getTrackingRefetchInterval({
        elapsedMs: 1_000,
        hasGeneration: true,
        hasValidation: true,
      })
    ).toBe(false);
  });

  it('keeps polling when generation tracking is not yet available (within the window)', () => {
    expect(
      getTrackingRefetchInterval({
        elapsedMs: 1_000,
        hasGeneration: false,
        hasValidation: false,
      })
    ).toBe(TRACKING_POLL_INTERVAL_MS);
  });

  it('keeps polling when generation is present but validation is still pending (within the window)', () => {
    expect(
      getTrackingRefetchInterval({
        elapsedMs: 1_000,
        hasGeneration: true,
        hasValidation: false,
      })
    ).toBe(TRACKING_POLL_INTERVAL_MS);
  });

  it('keeps polling past the legacy 60s cap while tracking is still incomplete', () => {
    // Regression: the gate phase alone can take ~47s and generation tracking is
    // only written after the gate completes. With the old 60s cap the poller
    // froze before the generation tracking entry was observed, so the Generation
    // row never appeared until the run finished. At 90s (past the old cap) with
    // incomplete tracking we must still be polling.
    expect(
      getTrackingRefetchInterval({
        elapsedMs: 90_000,
        hasGeneration: false,
        hasValidation: false,
      })
    ).toBe(TRACKING_POLL_INTERVAL_MS);
  });

  it('keeps polling through a multi-minute run (gate + generation) while incomplete', () => {
    expect(
      getTrackingRefetchInterval({
        elapsedMs: 3 * 60 * 1000,
        hasGeneration: true,
        hasValidation: false,
      })
    ).toBe(TRACKING_POLL_INTERVAL_MS);
  });

  it('stops polling once the safety window elapses for a run that never produced tracking', () => {
    expect(
      getTrackingRefetchInterval({
        elapsedMs: MAX_TRACKING_POLLING_MS + 1,
        hasGeneration: false,
        hasValidation: false,
      })
    ).toBe(false);
  });

  it('defaults the safety window to 10 minutes', () => {
    expect(MAX_TRACKING_POLLING_MS).toBe(10 * 60 * 1000);

    expect(
      getTrackingRefetchInterval({
        elapsedMs: MAX_TRACKING_POLLING_MS - 1,
        hasGeneration: false,
        hasValidation: false,
      })
    ).toBe(TRACKING_POLL_INTERVAL_MS);
  });

  it('defaults the poll interval to 2 seconds', () => {
    expect(TRACKING_POLL_INTERVAL_MS).toBe(2_000);
  });

  it('honors explicit maxPollingMs and pollIntervalMs overrides', () => {
    expect(
      getTrackingRefetchInterval({
        elapsedMs: 5_000,
        hasGeneration: false,
        hasValidation: false,
        maxPollingMs: 4_000,
        pollIntervalMs: 1_000,
      })
    ).toBe(false);

    expect(
      getTrackingRefetchInterval({
        elapsedMs: 3_000,
        hasGeneration: false,
        hasValidation: false,
        maxPollingMs: 4_000,
        pollIntervalMs: 1_000,
      })
    ).toBe(1_000);
  });
});
