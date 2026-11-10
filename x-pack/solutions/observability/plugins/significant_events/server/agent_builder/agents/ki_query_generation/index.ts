/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { registerKIQueryGenerationAgentType } from './ki_query_generation_agent';

export {
  KI_QUERY_GENERATION_AGENT_ID,
  KI_QUERY_GENERATION_AGENT_TYPE_ID,
  kiQueryGenerationAgentType,
  registerKIQueryGenerationAgentType,
} from './ki_query_generation_agent';
export { installKIQueryGenerationAgent } from './install_ki_query_generation_agent';

export const registerSignificantEventsKIQueryGenerationAgentTypes = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginSetup;
}): void => {
  registerKIQueryGenerationAgentType(agentBuilder);
};
