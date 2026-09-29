/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useIntegrationLastAlertIngested } from './use_integration_last_alert_ingested';
import { useQuery } from '@kbn/react-query';

vi.mock('@kbn/react-query');

const integrationName = 'splunk';

describe('useIntegrationLastAlertIngested', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return isLoading true', () => {
    (useQuery as Mock).mockReturnValue({
      isLoading: true,
      data: undefined,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useIntegrationLastAlertIngested({ integrationName }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.lastAlertIngested).toEqual(null);
  });

  it('should return last AlertIngested', () => {
    (useQuery as Mock).mockReturnValue({
      isLoading: false,
      data: {
        response: {
          columns: [{ name: 'event.ingested' }],
          values: [['2025-01-01T00:00:000Z']],
        },
      },
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useIntegrationLastAlertIngested({ integrationName }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastAlertIngested).toEqual('2025-01-01T00:00:000Z');
  });

  it('should return refetch function', () => {
    const refetch = vi.fn();
    (useQuery as Mock).mockReturnValue({
      isLoading: false,
      data: {},
      refetch,
    });

    const { result } = renderHook(() => useIntegrationLastAlertIngested({ integrationName }));

    expect(result.current.refetch).toBe(refetch);
  });
});
