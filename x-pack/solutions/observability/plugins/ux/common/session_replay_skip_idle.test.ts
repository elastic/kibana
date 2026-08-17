/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SKIP_IDLE_THRESHOLD_MS, skipIdleSeekMs } from './session_replay_skip_idle';

const meta = (timestamp: number) => ({ type: 4, timestamp });
const snapshot = (timestamp: number) => ({ type: 2, timestamp });
const mutation = (timestamp: number) => ({ type: 3, timestamp, data: { source: 0 } });
const click = (timestamp: number) => ({ type: 3, timestamp, data: { source: 2 } });
const move = (timestamp: number) => ({ type: 3, timestamp, data: { source: 1 } });
const stylesheet = (timestamp: number) => ({ type: 3, timestamp, data: { source: 8 } });

describe('skipIdleSeekMs', () => {
  it('jumps from a snapshot to the next event across a long gap', () => {
    const events = [meta(1_000), snapshot(1_000), click(21_000)];
    expect(skipIdleSeekMs(events, 0)).toBe(20_000);
  });

  it('does not jump when the next event is within the threshold', () => {
    const events = [meta(0), snapshot(0), click(SKIP_IDLE_THRESHOLD_MS - 1)];
    expect(skipIdleSeekMs(events, 0)).toBeNull();
  });

  it('does not jump across frequent mutations', () => {
    const events = [meta(0), snapshot(0), mutation(100), mutation(200), click(15_000)];
    expect(skipIdleSeekMs(events, 50)).toBeNull();
  });

  it('does not jump while the mouse is still moving', () => {
    const events = [meta(0), snapshot(0), move(100), move(400), click(800)];
    expect(skipIdleSeekMs(events, 100)).toBeNull();
  });

  it('jumps to the next event after a trailing idle gap', () => {
    const events = [meta(0), snapshot(0), click(500), mutation(20_000)];
    expect(skipIdleSeekMs(events, 600)).toBe(20_000);
  });

  it('returns null at the end of the recording', () => {
    const events = [meta(0), snapshot(0), click(500)];
    expect(skipIdleSeekMs(events, 500)).toBeNull();
  });

  it('jumps to the next snapshot cluster when a recording has no pointer events', () => {
    const start = 1_000_000;
    const later = start + 75_566_816;
    const end = later + 3_589_049;
    const events = [
      mutation(start),
      meta(start + 2),
      snapshot(start + 50),
      mutation(start + 986),
      meta(later),
      snapshot(later + 676),
      stylesheet(later + 1_200),
      meta(end),
      snapshot(end + 65),
      mutation(end + 999),
    ];
    expect(skipIdleSeekMs(events, 1_000)).toBe(later - start);
    expect(skipIdleSeekMs(events, later - start + 2_000)).toBe(end - start);
  });
});
