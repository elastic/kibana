/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEncodedPowershellTwin } from '../scenarios/encoded_powershell';
import { FP_TP_BASE_TIME } from './constants';
import { shiftTwinToNow } from './shift_timestamps';

describe('shiftTwinToNow', () => {
  const now = new Date('2026-09-17T16:00:00.000Z');
  const shifted = shiftTwinToNow(buildEncodedPowershellTwin('fp'), now);
  const expectedDeltaMs = now.getTime() - FP_TP_BASE_TIME.getTime();

  it('returns an attack timestamp shifted by the frozen-to-now delta', () => {
    const original = FP_TP_BASE_TIME.getTime();
    expect(Date.parse(shifted.attack['@timestamp'] as string)).toBe(original + expectedDeltaMs);
  });

  it('returns alert timestamps later than the frozen base time', () => {
    expect(Date.parse(shifted.alerts[0].source['@timestamp'] as string)).toBeGreaterThan(
      FP_TP_BASE_TIME.getTime()
    );
  });

  it('returns unchanged gold classification', () => {
    expect(shifted.gold.classification).toBe('false_positive');
  });
});
