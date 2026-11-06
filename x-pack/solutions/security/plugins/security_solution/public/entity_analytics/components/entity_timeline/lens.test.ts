/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFaceliftEntityTimeline } from '../home/facelift/prototype_data/entity_timeline_data';
import { DAY_MS, getModifiersAt, getRiskExclusionReason, getRunningScore } from './lens';

describe('entity timeline lens', () => {
  const data = getFaceliftEntityTimeline('id-amber');

  it('resolves amber from the identity, its records and display names', () => {
    expect(data).not.toBeNull();
    expect(getFaceliftEntityTimeline('00u1a4ebafHGJKr5d697')).toBe(data);
    expect(getFaceliftEntityTimeline(undefined, 'amber.rodriguez@acme.com')).toBe(data);
    expect(getFaceliftEntityTimeline('id-maria')).toBeNull();
  });

  it('builds the running score up to the current risk score', () => {
    const now = Date.now();
    const points = getRunningScore(data!, { from: now - 30 * DAY_MS, to: now }, now);
    expect(points[0].y).toBe(22);
    expect(points[points.length - 1].y).toBe(data!.riskScore);
  });

  it('replays modifiers carried into the window', () => {
    const modifiers = getModifiersAt(data!, Date.now() - 30 * DAY_MS);
    expect(modifiers.map((modifier) => modifier.value)).toEqual([
      'High impact',
      'Privileged users',
    ]);
    expect(modifiers.reduce((total, modifier) => total + modifier.contribution, 0)).toBe(22);
  });

  it('explains why closed alerts and anomalies do not count', () => {
    const closed = data!.events.find((event) => event.id === 'al-impossible-travel')!;
    const anomaly = data!.events.find((event) => event.id === 'an-sharepoint')!;
    expect(getRiskExclusionReason(closed)).toMatch(/Closed/);
    expect(getRiskExclusionReason(anomaly)).toMatch(/promotes/);
  });
});
