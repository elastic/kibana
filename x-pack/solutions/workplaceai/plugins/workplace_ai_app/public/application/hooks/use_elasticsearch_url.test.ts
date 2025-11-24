/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useElasticsearchUrl } from './use_elasticsearch_url';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

describe('useElasticsearchUrl', () => {
  const mockFetchElasticsearchConfig = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns placeholder URL when cloud plugin is unavailable', () => {
    mockUseKibana.mockReturnValue({
      services: {
        plugins: {
          cloud: undefined,
        },
      },
    });

    const { result } = renderHook(() => useElasticsearchUrl());

    expect(result.current).toBe('https://your_deployment_url');
  });

  it('returns placeholder URL initially and updates with cloud URL', async () => {
    mockFetchElasticsearchConfig.mockResolvedValue({
      elasticsearchUrl: 'https://cloud-es-url.elastic.co',
    });

    mockUseKibana.mockReturnValue({
      services: {
        plugins: {
          cloud: {
            fetchElasticsearchConfig: mockFetchElasticsearchConfig,
          },
        },
      },
    });

    const { result } = renderHook(() => useElasticsearchUrl());

    // Initially returns placeholder
    expect(result.current).toBe('https://your_deployment_url');

    // Wait for async update
    await waitFor(() => {
      expect(result.current).toBe('https://cloud-es-url.elastic.co');
    });

    expect(mockFetchElasticsearchConfig).toHaveBeenCalledTimes(1);
  });
});
