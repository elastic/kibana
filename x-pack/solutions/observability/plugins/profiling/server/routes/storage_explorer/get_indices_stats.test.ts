/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  allIndices,
  stacktracesIndices,
  universalProfilingEventsIndices,
} from './get_indices_stats';

describe('universalProfilingEventsIndices', () => {
  // `profiling-events-*` also matches the OTel profiling data streams, such as
  // `profiling-events-all.otel-default`, which storage explorer must not count.
  it('targets the Universal Profiling events without the OTel events', () => {
    expect(universalProfilingEventsIndices).toEqual([
      'profiling-events-*',
      '-profiling-events-*.otel-*',
    ]);
  });

  it.each([
    ['allIndices', allIndices],
    ['stacktracesIndices', stacktracesIndices],
  ])('is how %s targets the events', (_name, indices) => {
    expect(indices.filter((index) => index.includes('profiling-events'))).toEqual(
      universalProfilingEventsIndices
    );
  });
});
