/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useMonitorDetailLocator } from './use_monitor_detail_locator';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useKibanaSpace } from '../../../hooks/use_kibana_space';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../hooks/use_kibana_space', () => ({
  useKibanaSpace: jest.fn(),
}));

const mockLocator = {
  getRedirectUrl: jest.fn(),
};

describe('useMonitorDetailLocator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: jest.fn().mockReturnValue(mockLocator),
            },
          },
        },
      },
    });
    (useKibanaSpace as jest.Mock).mockReturnValue({ space: { id: 'default' } });
  });

  it('should generate the correct monitor URL', async () => {
    const mockUrl = 'http://example.com/monitor';
    mockLocator.getRedirectUrl.mockReturnValue(mockUrl);

    const { result } = renderHook(() =>
      useMonitorDetailLocator({
        configId: 'test-config',
        locationId: 'test-location',
        timeRange: { from: 'now-15m', to: 'now' },
        tabId: 'overview',
      })
    );

    await waitFor(() => {
      expect(mockLocator.getRedirectUrl).toHaveBeenCalledWith({
        configId: 'test-config',
        locationId: 'test-location',
        timeRange: { from: 'now-15m', to: 'now' },
        tabId: 'overview',
      });
    });

    expect(result.current).toBe(mockUrl);
  });

  it('should return undefined if locator is not available', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        },
      },
    });

    const { result } = renderHook(() =>
      useMonitorDetailLocator({
        configId: 'test-config',
      })
    );

    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });
  });
});
