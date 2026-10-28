/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROFILING_EVENTS_INDEX_BY_SCHEMA, ProfilingSchema } from '@kbn/profiling-utils';
import type { ProfilingESClient } from '../../../utils/profiling_es_client';
import { hasOtelProfilingData } from './has_otel_profiling_data';

describe('hasOtelProfilingData', () => {
  function createClient() {
    const search = jest.fn();
    const client = { search } as unknown as ProfilingESClient;
    return { client, search };
  }

  it('searches the OTel profiling events data streams leniently', async () => {
    const { client, search } = createClient();
    search.mockResolvedValue({ hits: { total: { value: 0 } } });

    await hasOtelProfilingData({ client });

    expect(search).toHaveBeenCalledWith('has_any_otel_profiling_data', {
      index: PROFILING_EVENTS_INDEX_BY_SCHEMA[ProfilingSchema.OTEL],
      size: 0,
      track_total_hits: 1,
      terminate_after: 1,
      ignore_unavailable: true,
      allow_no_indices: true,
    });
  });

  it('returns true when there are hits', async () => {
    const { client, search } = createClient();
    search.mockResolvedValue({ hits: { total: { value: 1 } } });

    await expect(hasOtelProfilingData({ client })).resolves.toBe(true);
  });

  it('returns false when there are no hits', async () => {
    const { client, search } = createClient();
    search.mockResolvedValue({ hits: { total: { value: 0 } } });

    await expect(hasOtelProfilingData({ client })).resolves.toBe(false);
  });

  it('rethrows search errors', async () => {
    const { client, search } = createClient();
    const error = new Error('security_exception');
    search.mockRejectedValue(error);

    await expect(hasOtelProfilingData({ client })).rejects.toBe(error);
  });
});
