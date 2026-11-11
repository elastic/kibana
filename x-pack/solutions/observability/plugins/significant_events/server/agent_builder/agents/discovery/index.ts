/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { registerDiscoveryAgentType } from './discovery';

export {
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID,
  discoveryAgentType,
  registerDiscoveryAgentType,
} from './discovery';
export { installDiscoveryAgents } from './install_discovery_agents';

export const registerSignificantEventsDiscoveryAgentTypes = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginSetup;
}): void => {
  registerDiscoveryAgentType(agentBuilder);
};
