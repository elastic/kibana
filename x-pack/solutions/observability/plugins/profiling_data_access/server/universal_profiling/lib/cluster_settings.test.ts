/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSetupOptions } from './setup';
import { validateProfilingStatus, validateResourceManagement } from './cluster_settings';

describe('cluster_settings validators', () => {
  function createSetupOptions() {
    const universalProfilingStatus = jest.fn();

    const client = {
      universalProfiling: {
        status: universalProfilingStatus,
      },
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
      universalProfilingStatus,
    };
  }

  describe('validateResourceManagement', () => {
    it('returns resource management and resource flags from status', async () => {
      const { setupOptions, universalProfilingStatus } = createSetupOptions();
      universalProfilingStatus.mockResolvedValue({
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

    it('returns fallback values when status throws', async () => {
      const { setupOptions, universalProfilingStatus } = createSetupOptions();
      universalProfilingStatus.mockRejectedValue(new Error('profilingStatus failed'));

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
    it('returns profiling enabled value from status', async () => {
      const { setupOptions, universalProfilingStatus } = createSetupOptions();
      universalProfilingStatus.mockResolvedValue({
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

    it('rethrows when profilingStatus throws', async () => {
      const { setupOptions, universalProfilingStatus } = createSetupOptions();
      const error = new Error('profilingStatus failed');
      universalProfilingStatus.mockRejectedValue(error);

      await expect(validateProfilingStatus(setupOptions)).rejects.toBe(error);
    });
  });
});
