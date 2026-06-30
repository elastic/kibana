/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAgentBuilderMcpUrl } from './use_mcp_url';
import { useKibanaUrl } from './use_kibana_url';
import { MCP_SERVER_PATH } from '@kbn/agent-builder-plugin/public';

jest.mock('./use_kibana_url');

const mockUseKibanaUrl = useKibanaUrl as jest.Mock;

describe('useAgentBuilderMcpUrl', () => {
  it('appends MCP_SERVER_PATH to the kibana URL', () => {
    mockUseKibanaUrl.mockReturnValue({ kibanaUrl: 'https://kibana.example.com' });

    const { result } = renderHook(() => useAgentBuilderMcpUrl());

    expect(result.current).toBe(`https://kibana.example.com${MCP_SERVER_PATH}`);
  });

  it('handles a kibana URL with a space path', () => {
    mockUseKibanaUrl.mockReturnValue({ kibanaUrl: 'https://kibana.example.com/s/my-space' });

    const { result } = renderHook(() => useAgentBuilderMcpUrl());

    expect(result.current).toBe(`https://kibana.example.com/s/my-space${MCP_SERVER_PATH}`);
  });
});
