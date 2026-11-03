/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSetupOptions } from './setup';
import { hasProfilingData } from './has_profiling_data';

describe('hasProfilingData', () => {
  function createSetupOptions() {
    const search = jest.fn();

    const setupOptions = {
      client: {} as ProfilingSetupOptions['client'],
      clientWithProfilingAuth: { search },
      logger: {} as ProfilingSetupOptions['logger'],
      soClient: {} as ProfilingSetupOptions['soClient'],
      spaceId: 'test-space',
    } as unknown as ProfilingSetupOptions;

    return { setupOptions, search };
  }

  it('searches the Universal Profiling indices, excluding the OTel ones', async () => {
    const { setupOptions, search } = createSetupOptions();
    search.mockResolvedValue({ hits: { total: { value: 0 } } });

    await hasProfilingData(setupOptions);

    expect(search).toHaveBeenCalledWith('has_any_profiling_data', {
      index: ['profiling*', '-*.otel-*'],
      size: 0,
      track_total_hits: 1,
      terminate_after: 1,
    });
  });

  it('returns data available when there are hits', async () => {
    const { setupOptions, search } = createSetupOptions();
    search.mockResolvedValue({ hits: { total: { value: 1 } } });

    await expect(hasProfilingData(setupOptions)).resolves.toEqual({
      data: { available: true },
    });
  });

  it('returns data not available when there are no hits', async () => {
    const { setupOptions, search } = createSetupOptions();
    search.mockResolvedValue({ hits: { total: { value: 0 } } });

    await expect(hasProfilingData(setupOptions)).resolves.toEqual({
      data: { available: false },
    });
  });

  it('returns data not available when the search fails', async () => {
    const { setupOptions, search } = createSetupOptions();
    search.mockRejectedValue(new Error('search failed'));

    await expect(hasProfilingData(setupOptions)).resolves.toEqual({
      data: { available: false },
    });
  });
});
