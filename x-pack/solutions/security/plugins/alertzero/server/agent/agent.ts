/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode, type AgentCreateRequest } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { ALERTZERO_THIN_AGENT_ID } from '@kbn/alertzero-common';

export { ALERTZERO_THIN_AGENT_ID };

export const ALERTZERO_THIN_AGENT_TYPE_ID =
  `${internalNamespaces.security}.alertzero-type` as const;

export const ALERTZERO_THIN_AGENT_NAME = 'AlertZero Agent';

export const ALERTZERO_THIN_AGENT_DESCRIPTION = 'Shared thin base agent for AlertZero Workers. ';

export const ALERTZERO_THIN_AGENT_LABELS = ['security', 'alertzero', 'watch'] as const;

export const ALERTZERO_THIN_AGENT_AVATAR_SYMBOL = 'AZ';

/** Owned by Cases (`CASES_OUTCOMES_AI_INDEX_ID`); AlertZero doesn't depend on the Cases plugin. */
export const CASES_OUTCOMES_AI_INDEX_ID = 'cases-outcomes';

export const ALERTZERO_THIN_AGENT_INSTRUCTIONS =
  'Before deciding, query prior case outcomes in the cases-outcomes AI index for the same rule, ' +
  'host, or observable and weigh the human verdict.';

/**
 * Thin AlertZero agent type: empty skill floor, elastic capabilities off.
 * Watch skills come from workflow metadata / `configuration_overrides.skill_ids`.
 * Type updates ship with code deploys without rewriting the persisted agent document.
 */
export const agentType = {
  id: ALERTZERO_THIN_AGENT_TYPE_ID,
  name: ALERTZERO_THIN_AGENT_NAME,
  description: ALERTZERO_THIN_AGENT_DESCRIPTION,
  avatar_icon: 'logoSecurity',
  baseConfiguration: {
    // TODO - add custom instructions for this agent type
    tools: [],
    skill_ids: [],
    connector_ids: [],
    enable_elastic_capabilities: false,
  },
} as const satisfies AgentTypeDefinition;

/**
 * With the Cases bridge on (POC), the agent also reads closed Cases outcomes (Cases' managed AI
 * index). Assigning it attaches the context engine's retrieval skill and query tools; without
 * the context engine on, it is dropped. With the bridge off the type is main's.
 */
export const getAgentType = ({ casesOutcomes }: { casesOutcomes: boolean }) =>
  casesOutcomes
    ? ({
        ...agentType,
        baseConfiguration: {
          ...agentType.baseConfiguration,
          instructions: ALERTZERO_THIN_AGENT_INSTRUCTIONS,
          ai_indices: [CASES_OUTCOMES_AI_INDEX_ID],
        },
      } satisfies AgentTypeDefinition)
    : agentType;

export const registerAgentType = (
  agentBuilder: AgentBuilderPluginSetup,
  { casesOutcomes = false }: { casesOutcomes?: boolean } = {}
): void => {
  agentBuilder.agents.registerType(getAgentType({ casesOutcomes }));
};

export const createAgentRequest = (): AgentCreateRequest => ({
  id: ALERTZERO_THIN_AGENT_ID,
  type: ALERTZERO_THIN_AGENT_TYPE_ID,
  name: ALERTZERO_THIN_AGENT_NAME,
  description: ALERTZERO_THIN_AGENT_DESCRIPTION,
  labels: [...ALERTZERO_THIN_AGENT_LABELS],
  avatar_symbol: ALERTZERO_THIN_AGENT_AVATAR_SYMBOL,
  access_control: { access_mode: AgentAccessControlMode.Shared },
  configuration: {
    tools: [],
    skill_ids: [],
    connector_ids: [],
    enable_elastic_capabilities: false,
  },
});
