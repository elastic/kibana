/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { registerFeatureIdentificationAgentType } from './feature_identification_agent';

export {
  FEATURE_IDENTIFICATION_AGENT_ID,
  FEATURE_IDENTIFICATION_AGENT_TYPE_ID,
  featureIdentificationAgentType,
  registerFeatureIdentificationAgentType,
} from './feature_identification_agent';
export { installFeatureIdentificationAgent } from './install_feature_identification_agent';

export const registerSignificantEventsFeatureIdentificationAgentTypes = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginSetup;
}): void => {
  registerFeatureIdentificationAgentType(agentBuilder);
};
