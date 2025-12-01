/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useMcpServerUrl } from './use_mcp_server_url';
import { useKibana } from './use_kibana';
import { useSpaceId } from './use_space_id';

jest.mock('./use_kibana');
jest.mock('./use_space_id');

const mockUseKibana = useKibana as jest.Mock;
const mockUseSpaceId = useSpaceId as jest.Mock;

describe('useMcpServerUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSpaceId.mockReturnValue('default');
  });

  it('returns MCP URL using publicBaseUrl when available', () => {
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          basePath: {
            publicBaseUrl: 'https://kibana.example.com',
            serverBasePath: '',
            get: jest.fn(() => '/base'),
          },
        },
        plugins: {
          cloud: undefined,
          spaces: undefined,
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
            serverBasePath: '',
            get: jest.fn(() => '/base'),
          },
        },
        plugins: {
          cloud: {
            kibanaUrl: 'https://cloud.elastic.co',
          },
          spaces: undefined,
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
            serverBasePath: '',
            get: jest.fn(() => '/s/default'),
          },
        },
        plugins: {
          cloud: undefined,
          spaces: undefined,
        },
      },
    });

    const { result } = renderHook(() => useMcpServerUrl());

    expect(result.current.mcpServerUrl).toBe(
      'https://localhost:5601/s/default/api/agent_builder/mcp'
    );

    // @ts-expect-error upgrade typescript v5.9.3
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
            serverBasePath: '',
            get: jest.fn(() => '/custom-base-path'),
          },
        },
        plugins: {
          cloud: undefined,
          spaces: undefined,
        },
      },
    });

    const { result } = renderHook(() => useMcpServerUrl());

    expect(result.current.mcpServerUrl).toBe(
      'https://example.com/custom-base-path/api/agent_builder/mcp'
    );

    // @ts-expect-error upgrade typescript v5.9.3
    window.location = originalLocation;
  });

  it('adds space ID to URL when not already present', () => {
    mockUseSpaceId.mockReturnValue('my-space');
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          basePath: {
            publicBaseUrl: 'https://kibana.example.com',
            serverBasePath: '',
            get: jest.fn(() => '/base'),
          },
        },
        plugins: {
          cloud: undefined,
          spaces: {},
        },
      },
    });

    const { result } = renderHook(() => useMcpServerUrl());

    expect(result.current.mcpServerUrl).toBe(
      'https://kibana.example.com/s/my-space/api/agent_builder/mcp'
    );
  });

  it('does not add space ID when already present in URL', () => {
    mockUseSpaceId.mockReturnValue('my-space');
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          basePath: {
            publicBaseUrl: 'https://kibana.example.com/s/existing-space',
            serverBasePath: '',
            get: jest.fn(() => '/s/existing-space'),
          },
        },
        plugins: {
          cloud: undefined,
          spaces: {},
        },
      },
    });

    const { result } = renderHook(() => useMcpServerUrl());

    expect(result.current.mcpServerUrl).toBe(
      'https://kibana.example.com/s/existing-space/api/agent_builder/mcp'
    );
  });
});
