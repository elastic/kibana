/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  type SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import { getSignificantEventsTuningConfig } from './get_significant_events_tuning_config';

const makeUiSettingsClient = (stored: unknown): Mocked<IUiSettingsClient> =>
  ({
    get: vi.fn().mockResolvedValue(JSON.stringify(stored)),
  } as unknown as Mocked<IUiSettingsClient>);

const makeLogger = (): Mocked<Logger> =>
  ({
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  } as unknown as Mocked<Logger>);

describe('getSignificantEventsTuningConfig', () => {
  it('returns defaults when uiSettings throws', async () => {
    const uiSettings = {
      get: vi.fn().mockRejectedValue(new Error('not found')),
    } as unknown as Mocked<IUiSettingsClient>;
    const logger = makeLogger();

    const result = await getSignificantEventsTuningConfig(uiSettings, logger);

    expect(result).toEqual(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('returns defaults when stored value is not valid JSON', async () => {
    const uiSettings = {
      get: vi.fn().mockResolvedValue('{not-valid-json'),
    } as unknown as Mocked<IUiSettingsClient>;
    const logger = makeLogger();

    const result = await getSignificantEventsTuningConfig(uiSettings, logger);

    expect(result).toEqual(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('merges valid stored values over defaults for missing keys', async () => {
    const stored: Partial<SignificantEventsTuningConfig> = { sample_size: 50, max_iterations: 10 };
    const result = await getSignificantEventsTuningConfig(
      makeUiSettingsClient(stored),
      makeLogger()
    );

    expect(result).toEqual({
      ...DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
      sample_size: 50,
      max_iterations: 10,
    });
  });

  it('falls back to full defaults when an out-of-bounds field is stored', async () => {
    // sample_size max is 100; 500 is out of bounds
    const stored = { sample_size: 500 };
    const logger = makeLogger();

    const result = await getSignificantEventsTuningConfig(makeUiSettingsClient(stored), logger);

    expect(result).toEqual(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid'));
  });
});
