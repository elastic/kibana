/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import { featuresPrompt } from '@kbn/nightshift-ai';
import { FEATURE_IDENTIFICATION_SKILL_ID } from '../../skills/feature_identification';
import groundingInstructions from './instructions.md.text';

export const FEATURE_IDENTIFICATION_AGENT_ID = 'significant-events.feature-identification';
export const FEATURE_IDENTIFICATION_AGENT_TYPE_ID =
  'platform.sig_events.feature-identification-type';

export const featureIdentificationAgentType = {
  id: FEATURE_IDENTIFICATION_AGENT_TYPE_ID,
  name: 'Feature Identification',
  description:
    'Extracts stable KI features from sample log documents by identifying entities, dependencies, infrastructure, technologies, and schema patterns, then returns the deduplicated structured result.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions: `${featuresPrompt}\n\n${groundingInstructions}`,
    skill_ids: [FEATURE_IDENTIFICATION_SKILL_ID],
    enable_elastic_capabilities: false,
    connector_ids: [],
    tools: [
      {
        tool_ids: [
          platformSignificantEventsTools.searchSimilarFeatures,
          platformSignificantEventsTools.searchEvent,
        ],
      },
    ],
  },
} as const satisfies AgentTypeDefinition;

export const registerFeatureIdentificationAgentType = (
  agentBuilder: AgentBuilderPluginSetup
): void => {
  agentBuilder.agents.registerType(featureIdentificationAgentType);
};
