/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { useOpenAgentBuilder } from './use_open_agent_builder';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockNavigateToApp = jest.fn();
const mockUseKibana = useKibana as jest.Mock;

beforeEach(() => {
  mockNavigateToApp.mockClear();
  mockUseKibana.mockReturnValue({
    services: { application: { navigateToApp: mockNavigateToApp } },
  });
});

describe('useOpenAgentBuilder', () => {
  it('navigates to the agent builder app', () => {
    const { result } = renderHook(() => useOpenAgentBuilder());
    result.current('hello');
    expect(mockNavigateToApp).toHaveBeenCalledWith(AGENT_BUILDER_APP_ID, expect.anything());
  });

  it('navigates to the new conversation path for the default agent', () => {
    const { result } = renderHook(() => useOpenAgentBuilder());
    result.current('hello');
    expect(mockNavigateToApp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        path: `/agents/${agentBuilderDefaultAgentId}/conversations/new`,
      })
    );
  });

  it('passes initialMessage in navigation state', () => {
    const { result } = renderHook(() => useOpenAgentBuilder());
    result.current('Help me build search');
    expect(mockNavigateToApp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        state: expect.objectContaining({ initialMessage: 'Help me build search' }),
      })
    );
  });

  it('uses search_getting_started as the default entryPointSource', () => {
    const { result } = renderHook(() => useOpenAgentBuilder());
    result.current('anything');
    expect(mockNavigateToApp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        state: expect.objectContaining({ entryPointSource: 'search_getting_started' }),
      })
    );
  });

  it('passes a custom source as entryPointSource', () => {
    const { result } = renderHook(() => useOpenAgentBuilder());
    result.current('anything', 'my_custom_source');
    expect(mockNavigateToApp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        state: expect.objectContaining({ entryPointSource: 'my_custom_source' }),
      })
    );
  });

  it('defaults initialMessage to an empty string when not provided', () => {
    const { result } = renderHook(() => useOpenAgentBuilder());
    result.current();
    expect(mockNavigateToApp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        state: expect.objectContaining({ initialMessage: '' }),
      })
    );
  });
});
