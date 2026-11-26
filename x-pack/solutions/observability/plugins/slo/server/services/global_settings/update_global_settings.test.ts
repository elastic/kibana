/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLOGlobalSettingsRepository } from './slo_global_settings_repository';
import { updateGlobalSettings } from './update_global_settings';

const SAVED_AT = new Date('2026-11-24T12:00:00.000Z');

describe('updateGlobalSettings', () => {
  let repository: jest.Mocked<SLOGlobalSettingsRepository>;

  beforeEach(() => {
    repository = { get: jest.fn(), save: jest.fn() };
  });

  it('saves the SLI retention and returns the saved value as the effective setting', async () => {
    repository.save.mockResolvedValue({
      sliRetention: { enabled: true, periodDays: 200, updatedAt: SAVED_AT },
    });

    const response = await updateGlobalSettings({
      repository,
      override: undefined,
      settings: { sliRetention: { enabled: true, periodDays: 200 } },
    });

    expect(repository.save).toHaveBeenCalledWith({
      sliRetention: { enabled: true, periodDays: 200 },
    });
    expect(response).toEqual({
      sliRetention: {
        enabled: true,
        periodDays: 200,
        updatedAt: SAVED_AT.toISOString(),
        effective: { enabled: true, periodDays: 200, source: 'settings' },
      },
    });
  });

  it('saves the SLI retention and keeps the kibana.yml override effective', async () => {
    repository.save.mockResolvedValue({
      sliRetention: { enabled: false, periodDays: 400, updatedAt: SAVED_AT },
    });

    const response = await updateGlobalSettings({
      repository,
      override: { enabled: true, periodDays: 200 },
      settings: { sliRetention: { enabled: false, periodDays: 400 } },
    });

    expect(repository.save).toHaveBeenCalledWith({
      sliRetention: { enabled: false, periodDays: 400 },
    });
    expect(response).toEqual({
      sliRetention: {
        enabled: false,
        periodDays: 400,
        updatedAt: SAVED_AT.toISOString(),
        effective: { enabled: true, periodDays: 200, source: 'config' },
      },
    });
  });
});
