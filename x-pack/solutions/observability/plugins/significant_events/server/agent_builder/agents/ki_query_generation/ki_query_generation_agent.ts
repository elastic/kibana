/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { significantEventsAgentPrompt } from '@kbn/nightshift-ai';
import { KI_QUERY_GENERATION_SKILL_ID } from '../../skills/ki_query_generation';
import groundingInstructions from './instructions.md.text';

export const KI_QUERY_GENERATION_AGENT_ID = 'significant-events.ki-query-generation';
export const KI_QUERY_GENERATION_AGENT_TYPE_ID = 'platform.sig_events.ki-query-generation-type';

export const kiQueryGenerationAgentType = {
  id: KI_QUERY_GENERATION_AGENT_TYPE_ID,
  name: 'KI Query Generation',
  description:
    'Generates feature-grounded ES|QL detection queries for a Streams target and validates them against its data.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions: `${significantEventsAgentPrompt}\n\n${groundingInstructions}`,
    skill_ids: [KI_QUERY_GENERATION_SKILL_ID],
    enable_elastic_capabilities: false,
    connector_ids: [],
    tools: [],
  },
} as const satisfies AgentTypeDefinition;

export const registerKIQueryGenerationAgentType = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.registerType(kiQueryGenerationAgentType);
};
