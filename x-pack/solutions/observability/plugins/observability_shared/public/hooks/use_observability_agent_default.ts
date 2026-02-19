/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';

const OBSERVABILITY_AGENT_ID = 'observability.agent';
const OBSERVABILITY_SESSION_TAG = 'observability';

/**
 * Sets the Observability Agent as the default agent for the Agent Builder flyout
 * when the user is on any Observability page.
 *
 * This hook should be called at the root component of each Observability application
 * to ensure that when users open the Observability Agent is pre-selected
 * instead of the default Elastic AI Agent.
 *
 * The Observability Agent is optimized for investigating logs, metrics, and traces,
 * providing better responses for Observability use cases.
 *
 */
export function useObservabilityAgentDefault(agentBuilder?: AgentBuilderPluginStart): void {
  useEffect(() => {
    if (!agentBuilder?.setConversationFlyoutActiveConfig) {
      return;
    }

    agentBuilder.setConversationFlyoutActiveConfig({
      sessionTag: OBSERVABILITY_SESSION_TAG,
      agentId: OBSERVABILITY_AGENT_ID,
      newConversation: true, // need to be defined with the team
    });

    return () => {
      agentBuilder.clearConversationFlyoutActiveConfig?.();
    };
  }, [agentBuilder]);
}
