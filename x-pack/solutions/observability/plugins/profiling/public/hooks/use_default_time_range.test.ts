/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UI_SETTINGS } from '@kbn/data-plugin/public';

jest.mock('../components/contexts/profiling_dependencies/use_profiling_dependencies');

import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useDefaultTimeRange } from './use_default_time_range';

describe('useDefaultTimeRange', () => {
  const mockTimePickerTimeDefaults = { from: 'now-15m', to: 'now' };
  const mockGetUiSetting = jest.fn(() => mockTimePickerTimeDefaults);

  const mockDependencies = (timePickerSharedState: { from: unknown; to: unknown }) => {
    (useProfilingDependencies as jest.Mock).mockReturnValue({
      start: {
        core: {
          uiSettings: {
            get: mockGetUiSetting,
          },
        },
        data: {
          query: {
            timefilter: {
              timefilter: {
                getTime: jest.fn(() => timePickerSharedState),
              },
            },
          },
        },
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the shared time picker state when it is set', () => {
    mockDependencies({ from: 'now-30m', to: 'now-10m' });

    expect(useDefaultTimeRange()).toEqual({ from: 'now-30m', to: 'now-10m' });
  });

  it('should fall back to the time picker defaults when the shared state is not set', () => {
    mockDependencies({ from: null, to: null });

    expect(useDefaultTimeRange()).toEqual(mockTimePickerTimeDefaults);
  });

  it('should fall back per bound when only one side of the shared state is set', () => {
    mockDependencies({ from: 'now-30m', to: undefined });

    expect(useDefaultTimeRange()).toEqual({ from: 'now-30m', to: 'now' });
  });

  it('should read the defaults from the time picker time defaults setting', () => {
    mockDependencies({ from: null, to: null });

    useDefaultTimeRange();

    expect(mockGetUiSetting).toHaveBeenCalledWith(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);
  });
});
