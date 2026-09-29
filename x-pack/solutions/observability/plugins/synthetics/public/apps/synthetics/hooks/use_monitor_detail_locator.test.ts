/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import { useMonitorDetailLocator } from './use_monitor_detail_locator';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useKibanaSpace } from '../../../hooks/use_kibana_space';

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_kibana_space', () => {
      const mocked = {
      useKibanaSpace: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockLocator = {
  getRedirectUrl: vi.fn(),
};

describe('useMonitorDetailLocator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useKibana as Mock).mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: vi.fn().mockReturnValue(mockLocator),
            },
          },
        },
      },
    });
    (useKibanaSpace as Mock).mockReturnValue({ space: { id: 'default' } });
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

  it('should pass `remoteName` through to the locator when provided', async () => {
    const mockUrl = 'http://example.com/monitor?remoteName=remote-1';
    mockLocator.getRedirectUrl.mockReturnValue(mockUrl);

    const { result } = renderHook(() =>
      useMonitorDetailLocator({
        configId: 'test-config',
        locationId: 'test-location',
        remoteName: 'remote-1',
      })
    );

    await waitFor(() => {
      expect(mockLocator.getRedirectUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          configId: 'test-config',
          locationId: 'test-location',
          remoteName: 'remote-1',
        })
      );
    });

    expect(result.current).toBe(mockUrl);
  });

  it('should return undefined if locator is not available', async () => {
    (useKibana as Mock).mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: vi.fn().mockReturnValue(undefined),
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
