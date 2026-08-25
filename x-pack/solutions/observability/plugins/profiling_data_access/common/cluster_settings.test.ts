/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSetupOptions } from './setup';
import {
  MAX_BUCKETS,
  validateMaximumBuckets,
  validateProfilingStatus,
  validateResourceManagement,
} from './cluster_settings';

describe('cluster_settings validators', () => {
  function createSetupOptions() {
    const getSettings = jest.fn();
    const profilingStatus = jest.fn();

    const client = {
      getEsClient: () => ({
        cluster: {
          getSettings,
        },
      }),
      profilingStatus,
    };

    const setupOptions = {
      client,
      clientWithProfilingAuth: {} as ProfilingSetupOptions['clientWithProfilingAuth'],
      logger: {} as ProfilingSetupOptions['logger'],
      soClient: {} as ProfilingSetupOptions['soClient'],
      spaceId: 'test-space',
    } as unknown as ProfilingSetupOptions;

    return {
      setupOptions,
      getSettings,
      profilingStatus,
    };
  }

  describe('validateMaximumBuckets', () => {
    it('returns configured true when search.max_buckets equals MAX_BUCKETS', async () => {
      const { setupOptions, getSettings } = createSetupOptions();
      getSettings.mockResolvedValue({
        persistent: {
          search: {
            max_buckets: MAX_BUCKETS.toString(),
          },
        },
      });

      await expect(validateMaximumBuckets(setupOptions)).resolves.toEqual({
        settings: {
          configured: true,
        },
      });
    });

    it('returns configured false when search.max_buckets does not equal MAX_BUCKETS', async () => {
      const { setupOptions, getSettings } = createSetupOptions();
      getSettings.mockResolvedValue({
        persistent: {
          search: {
            max_buckets: '42',
          },
        },
      });

      await expect(validateMaximumBuckets(setupOptions)).resolves.toEqual({
        settings: {
          configured: false,
        },
      });
    });

    it('returns configured false when getSettings throws', async () => {
      const { setupOptions, getSettings } = createSetupOptions();
      getSettings.mockRejectedValue(new Error('getSettings failed'));

      await expect(validateMaximumBuckets(setupOptions)).resolves.toEqual({
        settings: {
          configured: false,
        },
      });
    });
  });

  describe('validateResourceManagement', () => {
    it('returns resource management and resource flags from profilingStatus', async () => {
      const { setupOptions, profilingStatus } = createSetupOptions();
      profilingStatus.mockResolvedValue({
        resource_management: {
          enabled: true,
        },
        resources: {
          created: true,
          pre_8_9_1_data: true,
        },
      });

      await expect(validateResourceManagement(setupOptions)).resolves.toEqual({
        resource_management: {
          enabled: true,
        },
        resources: {
          created: true,
          pre_8_9_1_data: true,
        },
      });
    });

    it('returns fallback values when profilingStatus throws', async () => {
      const { setupOptions, profilingStatus } = createSetupOptions();
      profilingStatus.mockRejectedValue(new Error('profilingStatus failed'));

      await expect(validateResourceManagement(setupOptions)).resolves.toEqual({
        resource_management: {
          enabled: false,
        },
        resources: {
          created: false,
          pre_8_9_1_data: false,
        },
      });
    });
  });

  describe('validateProfilingStatus', () => {
    it('returns profiling enabled value from profilingStatus', async () => {
      const { setupOptions, profilingStatus } = createSetupOptions();
      profilingStatus.mockResolvedValue({
        profiling: {
          enabled: true,
        },
      });

      await expect(validateProfilingStatus(setupOptions)).resolves.toEqual({
        profiling: {
          enabled: true,
        },
      });
    });

    it('returns profiling enabled false when profilingStatus throws', async () => {
      const { setupOptions, profilingStatus } = createSetupOptions();
      profilingStatus.mockRejectedValue(new Error('profilingStatus failed'));

      await expect(validateProfilingStatus(setupOptions)).resolves.toEqual({
        profiling: {
          enabled: false,
        },
      });
    });
  });
});
