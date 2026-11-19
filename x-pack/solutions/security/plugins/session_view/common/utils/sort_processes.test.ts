/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Process } from '..';
import { sortProcesses } from './sort_processes';
import { mockProcessMap } from '../mocks/constants/session_view_process.mock';

describe('sortProcesses(a, b)', () => {
  it('sorts processes in ascending order by start time', () => {
    const processes = Object.values(mockProcessMap);

    // shuffle some things to ensure all sort lines are hit
    const c = processes[0];
    processes[0] = processes[processes.length - 1];
    processes[processes.length - 1] = c;

    processes.sort(sortProcesses);

    for (let i = 0; i < processes.length - 1; i++) {
      const current = processes[i];
      const next = processes[i + 1];
      expect(
        new Date(next.getDetails().process!.start!) >=
          new Date(current.getDetails().process!.start!)
      ).toBeTruthy();
    }
  });
});

describe('sortProcesses with mixed timestamp precision', () => {
  const processWithStart = (start?: string) =>
    ({ getDetails: () => ({ process: { start } }) } as unknown as Process);

  it('orders millisecond and nanosecond timestamps chronologically', () => {
    const starts = [
      '2026-11-18T20:13:18Z',
      '2026-11-18T20:13:18.125Z',
      '2026-11-18T20:13:18.125000001Z',
      '2026-11-18T20:13:18.124999999Z',
      '2026-11-18T20:13:17.999999999Z',
      undefined,
    ];
    const sorted = starts
      .map(processWithStart)
      .sort(sortProcesses)
      .map((process) => process.getDetails().process?.start);

    expect(sorted).toEqual([
      undefined,
      '2026-11-18T20:13:17.999999999Z',
      '2026-11-18T20:13:18Z',
      '2026-11-18T20:13:18.124999999Z',
      '2026-11-18T20:13:18.125Z',
      '2026-11-18T20:13:18.125000001Z',
    ]);
  });
});
