/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import dedent from 'dedent';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStartDependencies,
  ObservabilityAgentBuilderPluginStart,
} from '../types';
import { OBSERVABILITY_AGENT_TOOL_IDS } from '../tools/register_tools';
import { OBSERVABILITY_GET_INDEX_INFO_TOOL_ID } from '../tools';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

export const OBSERVABILITY_AGENT_ID = 'observability.agent';

export async function registerObservabilityAgent({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}) {
  plugins.agentBuilder?.agents.register({
    id: OBSERVABILITY_AGENT_ID,
    name: 'Observability Agent',
    description: 'Agent specialized in logs, metrics, and traces',
    avatar_icon: 'logoObservability',
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    configuration: {
      instructions:
        dedent(`You are an observability specialist agent that helps Site Reliability Engineers (SREs) investigate incidents and understand system health.
        
        ${getInvestigationInstructions()}
        ${getReasoningInstructions()}
        ${getFieldDiscoveryInstructions()}
      `),
      tools: [{ tool_ids: OBSERVABILITY_AGENT_TOOL_IDS }],
    },
  });

  logger.debug('Successfully registered observability agent in agent-builder');
}

function getInvestigationInstructions() {
  return dedent(`
    ### INVESTIGATION APPROACH
    
    Follow a progressive workflow - start broad, then narrow down:
    1. **Triage**: What's the severity? How many users/services affected?
    2. **Scope**: Which components are affected? What's the blast radius?
    3. **Timeline**: When did it start? What changed before symptoms appeared?
    4. **Correlation**: What error patterns exist? What's the sequence of events?
    5. **Root Cause**: Distinguish the SOURCE (where the problem started) from AFFECTED services (impacted downstream)
    6. **Verification**: Does your hypothesis explain ALL the symptoms? If not, dig deeper.
  `);
}

function getReasoningInstructions() {
  return dedent(`
    ### REASONING PRINCIPLES
    
    - **Be quantitative**: Quote specific metrics (error rate %, latency ms, throughput rpm). Avoid vague terms like "high" without numbers.
    - **Correlation ≠ causation**: Look for temporal sequence (what happened FIRST) and causal mechanism.
    - **Consider all layers**: Infrastructure (CPU, memory, disk) → Application (latency, throughput, failure rate) → Dependencies (databases, caches, external APIs).
    - **Follow evidence**: Support hypotheses with data. Acknowledge uncertainty when evidence is inconclusive.
  `);
}

function getFieldDiscoveryInstructions() {
  return dedent(`
    ### FIELD DISCOVERY
    Before using field names in \`groupBy\`, \`kqlFilter\`, or \`aggregation.field\` parameters, call \`${OBSERVABILITY_GET_INDEX_INFO_TOOL_ID}\` first.
    Clusters use different naming conventions (ECS vs OpenTelemetry) - discovering fields first prevents errors.
  `);
}
