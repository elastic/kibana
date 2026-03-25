/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { useLeadingControlColumns } from './use_leading_control_columns';

describe('useLeadingControlColumns', () => {
  const defaultArgs = {
    canUseTimeline: false,
    investigateInTimeline: jest.fn(),
    isAgentBuilderEnabled: false,
    agentBuilder: undefined as AgentBuilderPluginStart | undefined,
  };

  it('returns no timeline action when canUseTimeline is false', () => {
    const { result } = renderHook(() => useLeadingControlColumns(defaultArgs));
    expect(result.current.find((c) => c.id === 'entity-analytics-timeline-action')).toBeUndefined();
  });

  it('returns timeline action when canUseTimeline is true', () => {
    const { result } = renderHook(() =>
      useLeadingControlColumns({ ...defaultArgs, canUseTimeline: true })
    );
    expect(result.current.find((c) => c.id === 'entity-analytics-timeline-action')).toBeDefined();
  });

  it('returns no AI action when isAgentBuilderEnabled is false', () => {
    const { result } = renderHook(() => useLeadingControlColumns(defaultArgs));
    expect(result.current.find((c) => c.id === 'entity-analytics-ai-action')).toBeUndefined();
  });

  it('returns AI action when isAgentBuilderEnabled is true and agentBuilder has openChat', () => {
    const { result } = renderHook(() =>
      useLeadingControlColumns({
        ...defaultArgs,
        isAgentBuilderEnabled: true,
        agentBuilder: {
          openChat: jest.fn(),
        } as unknown as AgentBuilderPluginStart,
      })
    );
    expect(result.current.find((c) => c.id === 'entity-analytics-ai-action')).toBeDefined();
  });

  it('returns no AI action when agentBuilder is undefined even if enabled', () => {
    const { result } = renderHook(() =>
      useLeadingControlColumns({
        ...defaultArgs,
        isAgentBuilderEnabled: true,
        agentBuilder: undefined,
      })
    );
    expect(result.current.find((c) => c.id === 'entity-analytics-ai-action')).toBeUndefined();
  });
});
