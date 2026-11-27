/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecordedCallInput } from './performance_recorder';
import { createPerformanceRecorder } from './performance_recorder';

const call = (route: string): RecordedCallInput => ({
  route,
  startedAt: 0,
  browserMs: 1,
  status: 'ok',
  serverMs: null,
  errorMessage: null,
  list: null,
});

describe('createPerformanceRecorder', () => {
  it('keeps the latest calls newest first, at most the capacity of them', () => {
    const recorder = createPerformanceRecorder(2);

    ['a', 'b', 'c'].forEach((route) => recorder.record(call(route)));

    expect(recorder.getCalls().map(({ route, id }) => [route, id])).toEqual([
      ['c', 3],
      ['b', 2],
    ]);
  });

  it('emits each change to subscribers and empties on clear', () => {
    const recorder = createPerformanceRecorder();
    const emitted: number[] = [];
    const subscription = recorder.calls$.subscribe((calls) => emitted.push(calls.length));

    recorder.record(call('a'));
    recorder.clear();
    subscription.unsubscribe();

    expect(emitted).toEqual([0, 1, 0]);
  });
});
