/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { TestProviders } from '../../../../common/mock';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { useAlertAnalysisWorkflowAgents } from './use_alert_analysis_workflow_agents';

describe('useAlertAnalysisWorkflowAgents', () => {
  const coreStart = coreMock.createStart();
  const listAgentsMock = jest.fn();

  const wrapperWith = (agentBuilder?: unknown) => {
    const startServices = createStartServicesMock(coreStart);
    const services = { ...startServices, agentBuilder } as unknown as typeof startServices;
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <TestProviders startServices={services}>{children}</TestProviders>
    );
    return Wrapper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    listAgentsMock.mockResolvedValue([
      { id: 'elastic-ai-agent', name: 'Elastic AI Agent', readonly: false },
      { id: 'my-custom-agent', name: 'My Custom Agent', readonly: false },
      { id: 'platform.builtin', name: 'Built-in Agent', readonly: true },
    ]);
  });

  it('reports not loading when Agent Builder is unavailable', () => {
    const { result } = renderHook(() => useAlertAnalysisWorkflowAgents(true), {
      wrapper: wrapperWith(undefined),
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('reports not loading when the hook is disabled', () => {
    const { result } = renderHook(() => useAlertAnalysisWorkflowAgents(false), {
      wrapper: wrapperWith({ agents: { list: listAgentsMock } }),
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('returns non-readonly agents when enabled', async () => {
    const { result } = renderHook(() => useAlertAnalysisWorkflowAgents(true), {
      wrapper: wrapperWith({ agents: { list: listAgentsMock } }),
    });

    await waitFor(() =>
      expect(result.current.agents).toEqual([
        { id: 'elastic-ai-agent', name: 'Elastic AI Agent' },
        { id: 'my-custom-agent', name: 'My Custom Agent' },
      ])
    );
  });
});
