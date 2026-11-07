/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useCodexSessions } from '../ai_agents/use_codex_sessions';
import { useAgentInventory } from '../ai_agents/use_agent_inventory';
import { useExecutiveBriefAgents } from './use_executive_brief_agents';

jest.mock('../ai_agents/use_codex_sessions');
jest.mock('../ai_agents/use_agent_inventory');
const external = jest.mocked(useCodexSessions);
const inventory = jest.mocked(useAgentInventory);

beforeEach(() => {
  jest.clearAllMocks();
  external.mockReturnValue({
    sessions: [],
    isLoading: false,
    isRefreshing: false,
    unavailable: false,
    partial: false,
    total: 0,
    refetch: jest.fn(),
  });
  inventory.mockReturnValue({
    agents: [],
    status: 'empty',
    definitionsStatus: 'empty',
    toolsStatus: 'empty',
    activityStatus: 'empty',
    isLoading: false,
    isRefreshing: false,
    lookbackDays: 30,
    refetch: jest.fn(),
  });
});

it('uses the same space-scoped provider caches as Overview and does not fetch detailed content', () => {
  const { result } = renderHook(() => useExecutiveBriefAgents('marketing'));
  expect(external).toHaveBeenCalledWith('marketing', 'codex');
  expect(external).toHaveBeenCalledWith('marketing', 'cursor');
  expect(external).toHaveBeenCalledWith('marketing', 'claude_desktop');
  expect(external).toHaveBeenCalledWith('marketing', 'google_adk');
  expect(inventory).toHaveBeenCalledWith('marketing');
  expect(result.current.snapshot.providers.map((provider) => provider.provider)).toEqual([
    'codex',
    'cursor',
    'claude_desktop',
    'google_adk',
    'agent_builder',
  ]);
  expect(result.current.snapshot.totals.externalSessions).toBe(0);
});

it('refreshes each source and reports a pending refresh so a brief can wait for the final snapshot', () => {
  const refetchByProvider = {
    codex: jest.fn(),
    cursor: jest.fn(),
    claude_desktop: jest.fn(),
    google_adk: jest.fn(),
  };
  const refetchBuilder = jest.fn();
  external.mockImplementation((_spaceId, provider = 'codex') => ({
    sessions: [],
    isLoading: false,
    isRefreshing: true,
    unavailable: false,
    partial: false,
    total: 0,
    refetch: refetchByProvider[provider],
  }));
  inventory.mockReturnValue({
    agents: [],
    status: 'empty',
    definitionsStatus: 'empty',
    toolsStatus: 'empty',
    activityStatus: 'empty',
    isLoading: false,
    isRefreshing: false,
    lookbackDays: 30,
    refetch: refetchBuilder,
  });
  const { result } = renderHook(() => useExecutiveBriefAgents('default'));
  expect(result.current.isRefreshing).toBe(true);
  act(() => result.current.refetch());
  Object.values(refetchByProvider).forEach((refetch) => {
    expect(refetch).toHaveBeenCalledTimes(1);
  });
  expect(refetchBuilder).toHaveBeenCalledTimes(1);
});
