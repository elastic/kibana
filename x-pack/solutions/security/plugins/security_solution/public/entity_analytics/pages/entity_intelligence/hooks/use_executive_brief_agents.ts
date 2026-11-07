/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useCodexSessions } from '../ai_agents/use_codex_sessions';
import { useAgentInventory } from '../ai_agents/use_agent_inventory';
import { buildExecutiveBriefAgentSnapshot } from '../executive_brief_agents';
import type { ExecutiveBriefAgentSnapshot } from '../executive_brief_agents';

export interface ExecutiveBriefAgentsResult {
  snapshot: ExecutiveBriefAgentSnapshot;
  isLoading: boolean;
  isRefreshing: boolean;
  refetch: () => void;
}

/** Reuses Overview query caches and excludes raw agent content from the brief. */
export const useExecutiveBriefAgents = (spaceId?: string): ExecutiveBriefAgentsResult => {
  const codex = useCodexSessions(spaceId, 'codex');
  const cursor = useCodexSessions(spaceId, 'cursor');
  const claudeDesktop = useCodexSessions(spaceId, 'claude_desktop');
  const googleAdk = useCodexSessions(spaceId, 'google_adk');
  const builder = useAgentInventory(spaceId);
  const snapshot = useMemo(
    () =>
      buildExecutiveBriefAgentSnapshot({
        codex: {
          sessions: codex.sessions,
          isLoading: codex.isLoading,
          unavailable: codex.unavailable,
          partial: codex.partial,
        },
        cursor: {
          sessions: cursor.sessions,
          isLoading: cursor.isLoading,
          unavailable: cursor.unavailable,
          partial: cursor.partial,
        },
        claudeDesktop: {
          sessions: claudeDesktop.sessions,
          isLoading: claudeDesktop.isLoading,
          unavailable: claudeDesktop.unavailable,
          partial: claudeDesktop.partial,
        },
        googleAdk: {
          sessions: googleAdk.sessions,
          isLoading: googleAdk.isLoading,
          unavailable: googleAdk.unavailable,
          partial: googleAdk.partial,
        },
        builder: {
          agents: builder.agents,
          isLoading: builder.isLoading,
          status: builder.status,
          definitionsStatus: builder.definitionsStatus,
          activityStatus: builder.activityStatus,
        },
      }),
    [
      codex.sessions,
      codex.isLoading,
      codex.unavailable,
      codex.partial,
      cursor.sessions,
      cursor.isLoading,
      cursor.unavailable,
      cursor.partial,
      claudeDesktop.sessions,
      googleAdk.sessions,
      claudeDesktop.isLoading,
      googleAdk.isLoading,
      claudeDesktop.unavailable,
      googleAdk.unavailable,
      claudeDesktop.partial,
      googleAdk.partial,
      builder.agents,
      builder.isLoading,
      builder.status,
      builder.definitionsStatus,
      builder.activityStatus,
    ]
  );
  const { refetch: refetchCodex } = codex;
  const { refetch: refetchCursor } = cursor;
  const { refetch: refetchClaudeDesktop } = claudeDesktop;
  const { refetch: refetchGoogleAdk } = googleAdk;
  const { refetch: refetchBuilder } = builder;
  const refetch = useCallback(() => {
    void refetchCodex();
    void refetchCursor();
    void refetchClaudeDesktop();
    void refetchGoogleAdk();
    refetchBuilder();
  }, [refetchCodex, refetchCursor, refetchClaudeDesktop, refetchGoogleAdk, refetchBuilder]);
  return {
    snapshot,
    isLoading:
      codex.isLoading ||
      cursor.isLoading ||
      claudeDesktop.isLoading ||
      googleAdk.isLoading ||
      builder.isLoading,
    isRefreshing:
      codex.isRefreshing ||
      cursor.isRefreshing ||
      claudeDesktop.isRefreshing ||
      googleAdk.isRefreshing ||
      builder.isRefreshing,
    refetch,
  };
};
