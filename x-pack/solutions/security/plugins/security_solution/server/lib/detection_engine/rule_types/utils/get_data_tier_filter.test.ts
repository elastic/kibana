/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTierFilter } from './get_data_tier_filter';
import type { IUiSettingsClient } from '@kbn/core/server';

const uiSettingsClientMock = {
  get: jest.fn(),
} as unknown as IUiSettingsClient;

describe('getDataTierFilter', () => {
  it('should return empty array if ui settings empty', async () => {
    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce([]);
    const filters = await getDataTierFilter({ uiSettingsClient: uiSettingsClientMock });

    expect(filters).toEqual([]);
  });
  it('should return filters array if ui settings populated with single value', async () => {
    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce(['data_cold']);
    const filters = await getDataTierFilter({ uiSettingsClient: uiSettingsClientMock });

    expect(filters).toEqual([
      {
        meta: { negate: true },
        query: {
          terms: {
            _tier: ['data_cold'],
          },
        },
      },
    ]);
  });

  it('should return filters array if ui settings populated with multiple values', async () => {
    (uiSettingsClientMock.get as jest.Mock).mockResolvedValueOnce(['data_cold', 'data_frozen']);
    const filters = await getDataTierFilter({ uiSettingsClient: uiSettingsClientMock });

    expect(filters).toEqual([
      {
        meta: { negate: true },
        query: {
          terms: {
            _tier: ['data_cold', 'data_frozen'],
          },
        },
      },
    ]);
  });
});
