/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { DYNAMIC_SETTINGS_DEFAULTS, SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { apiService } from '../../../../utils/api_service';
import { setDynamicSettings } from './api';

vi.mock('../../../../utils/api_service', () => {
  const mocked = {
    apiService: { get: vi.fn(), put: vi.fn() },
  };
  return { ...mocked, default: mocked };
});

describe('setDynamicSettings', () => {
  const mockPut = apiService.put as Mock;

  beforeEach(() => {
    mockPut.mockReset();
    mockPut.mockResolvedValue({ success: true });
  });

  it('includes rebalancePrivateLocationShardsEnabled in the PUT body', async () => {
    await setDynamicSettings({
      settings: {
        ...DYNAMIC_SETTINGS_DEFAULTS,
        rebalancePrivateLocationShardsEnabled: false,
      },
    });

    expect(mockPut).toHaveBeenCalledWith(
      SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
      expect.objectContaining({
        rebalancePrivateLocationShardsEnabled: false,
      }),
      expect.objectContaining({ version: '2023-10-31' })
    );
  });
});
