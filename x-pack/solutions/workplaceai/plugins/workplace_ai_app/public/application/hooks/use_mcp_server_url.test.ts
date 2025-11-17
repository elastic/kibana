/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useMcpServerUrl } from './use_mcp_server_url';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

describe('useMcpServerUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns MCP URL using publicBaseUrl when available', () => {
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          basePath: {
            publicBaseUrl: 'https://kibana.example.com',
            get: jest.fn(() => '/base'),
          },
        },
        plugins: {
          cloud: undefined,
        },
      },
    });

    const { result } = renderHook(() => useMcpServerUrl());

    expect(result.current.mcpServerUrl).toBe('https://kibana.example.com/api/agent_builder/mcp');
  });

  it('returns MCP URL using cloud.kibanaUrl when publicBaseUrl is unavailable', () => {
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          basePath: {
            publicBaseUrl: undefined,
            get: jest.fn(() => '/base'),
          },
        },
        plugins: {
          cloud: {
            kibanaUrl: 'https://cloud.elastic.co',
          },
        },
      },
    });

    const { result } = renderHook(() => useMcpServerUrl());

    expect(result.current.mcpServerUrl).toBe('https://cloud.elastic.co/api/agent_builder/mcp');
  });

  it('returns MCP URL using window.location as fallback', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { origin: 'https://localhost:5601' } as any;

    mockUseKibana.mockReturnValue({
      services: {
        http: {
          basePath: {
            publicBaseUrl: undefined,
            get: jest.fn(() => '/s/default'),
          },
        },
        plugins: {
          cloud: undefined,
        },
      },
    });

    const { result } = renderHook(() => useMcpServerUrl());

    expect(result.current.mcpServerUrl).toBe(
      'https://localhost:5601/s/default/api/agent_builder/mcp'
    );

    window.location = originalLocation;
  });

  it('includes basePath in fallback URL', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { origin: 'https://example.com' } as any;

    mockUseKibana.mockReturnValue({
      services: {
        http: {
          basePath: {
            publicBaseUrl: undefined,
            get: jest.fn(() => '/custom-base-path'),
          },
        },
        plugins: {
          cloud: undefined,
        },
      },
    });

    const { result } = renderHook(() => useMcpServerUrl());

    expect(result.current.mcpServerUrl).toBe(
      'https://example.com/custom-base-path/api/agent_builder/mcp'
    );

    window.location = originalLocation;
  });
});
