/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MCP_SERVER_PATH } from '@kbn/agent-builder-plugin/public';
import { useMcpServerUrl } from './use_mcp_server_url';
import type { OnboardingServices } from '../services';

interface MockHttpOptions {
  publicBaseUrl?: string;
  basePath?: string;
  serverBasePath?: string;
}

const mockHttp = ({ publicBaseUrl, basePath = '', serverBasePath = '' }: MockHttpOptions) => ({
  basePath: { publicBaseUrl, serverBasePath, get: () => basePath },
});

const renderUseMcpServerUrl = (services: unknown) =>
  renderHook(() => useMcpServerUrl(), {
    wrapper: ({ children }) => (
      <KibanaContextProvider services={services as OnboardingServices}>
        {children}
      </KibanaContextProvider>
    ),
  });

describe('useMcpServerUrl', () => {
  it('builds the URL from the public base URL when available', () => {
    const { result } = renderUseMcpServerUrl({
      http: mockHttp({ publicBaseUrl: 'https://kibana.example.com' }),
      cloud: { kibanaUrl: 'https://cloud.example.com' },
    });

    expect(result.current).toBe(`https://kibana.example.com${MCP_SERVER_PATH}`);
  });

  it('falls back to the cloud Kibana URL', () => {
    const { result } = renderUseMcpServerUrl({
      http: mockHttp({}),
      cloud: { kibanaUrl: 'https://cloud.example.com' },
    });

    expect(result.current).toBe(`https://cloud.example.com${MCP_SERVER_PATH}`);
  });

  it('falls back to the window origin and base path', () => {
    const { result } = renderUseMcpServerUrl({
      http: mockHttp({ basePath: '/base-path', serverBasePath: '/base-path' }),
    });

    expect(result.current).toBe(`${window.location.origin}/base-path${MCP_SERVER_PATH}`);
  });

  it('adds the current space prefix to a space-agnostic base URL', () => {
    const { result } = renderUseMcpServerUrl({
      http: mockHttp({ publicBaseUrl: 'https://kibana.example.com', basePath: '/s/my-space' }),
    });

    expect(result.current).toBe(`https://kibana.example.com/s/my-space${MCP_SERVER_PATH}`);
  });

  it('does not duplicate an explicit space prefix in the base URL', () => {
    const { result } = renderUseMcpServerUrl({
      http: mockHttp({
        publicBaseUrl: 'https://kibana.example.com/s/my-space',
        basePath: '/s/my-space',
      }),
    });

    expect(result.current).toBe(`https://kibana.example.com/s/my-space${MCP_SERVER_PATH}`);
  });

  it('keeps the fallback URL intact when it already contains the space prefix', () => {
    const { result } = renderUseMcpServerUrl({
      http: mockHttp({
        basePath: '/base-path/s/my-space',
        serverBasePath: '/base-path',
      }),
    });

    expect(result.current).toBe(`${window.location.origin}/base-path/s/my-space${MCP_SERVER_PATH}`);
  });
});
