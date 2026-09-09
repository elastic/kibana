/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { apiService } from '../../../../utils/api_service';
import { setDynamicSettings } from './api';

jest.mock('../../../../utils/api_service', () => ({
  apiService: { get: jest.fn(), put: jest.fn() },
}));

describe('setDynamicSettings', () => {
  const mockPut = apiService.put as jest.Mock;

  beforeEach(() => {
    mockPut.mockReset();
    mockPut.mockResolvedValue({ success: true });
  });

  it('uses PUT for partial settings updates', async () => {
    await setDynamicSettings({
      settings: {
        rebalancePrivateLocationShardsEnabled: false,
      },
    });

    expect(mockPut).toHaveBeenCalledWith(
      SYNTHETICS_API_URLS.DYNAMIC_SETTINGS,
      expect.objectContaining({
        rebalancePrivateLocationShardsEnabled: false,
      }),
      expect.anything(),
      expect.objectContaining({ version: '2023-10-31' })
    );
  });
});
