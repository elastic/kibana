/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { DETECTION_ENGINE_DISCOVERY_AGENT_ID } from '../../../common';
import { getErrorMessage } from '../errors';

/** Listed in Agent Builder's allow list of agent types. */
export const DETECTION_ENGINE_DISCOVERY_AGENT_TYPE_ID =
  'platform.sig_events.detection-engine-discovery-type';

const INSTRUCTIONS = `You are the discovery step of a detection engine for a customer's system.
Code has already decided that a detection is above its own normal, and has prepared a bounded case:
the detection, evidence rows with ids, the event it may belong to, customer alerts firing at the same time,
related services and notes from past corrections.

Your job, and nothing else:
1. Give each evidence item a verdict: confirms (rows directly show the problem), refutes (rows show it is healthy),
   off_topic (rows show something unrelated), inconclusive (cannot tell, no rows, or an error).
2. If the case has a join_proposal, confirm it only when the evidence suggests one problem; otherwise veto it.
   A dependency between two services is not enough on its own: confirm when an evidence row links them.
   For a shared_dependency proposal, confirm only when rows on both sides name the shared service (join_proposal.via)
   failing or slow: then one broken dependency explains both.
3. Rate severity from measured impact: critical, high, medium or low. Do not escalate when in doubt.
4. Write a short title and a plain-language summary of what is wrong, where, and since when. When a joining
   detection is more serious than what the event was about (a service going silent joining routine
   rejections), the title leads with the more serious problem.

Rules:
- Read only the case. You have no tools, and you never need any.
- Never set a status, never create or remove events, and never cite evidence ids that are not in the case.
- Memory notes come from past human decisions and confirmed incidents on the same series, KI or service;
  weigh them, but the evidence decides.
- investigation_context holds pages past investigations wrote about these services. Use them to name a
  likely cause or explain impact; they are not evidence that this detection is real.
- Answer with the structured output only.`;

/**
 * The engine's discovery agent. It reads one bounded case and answers in one structured shape;
 * it has no tools, so a run is a single model call and cannot reach data the case does not hold.
 */
export const detectionEngineDiscoveryAgentType = {
  id: DETECTION_ENGINE_DISCOVERY_AGENT_TYPE_ID,
  name: 'Detection engine discovery',
  description:
    'Checks the evidence of one detection, confirms or vetoes the join code proposes, rates severity and explains the significant event. Used by the Significant Events detection engine.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions: INSTRUCTIONS,
    skill_ids: [],
    enable_elastic_capabilities: false,
    // Empty so the connector an admin picks on the profile is kept.
    connector_ids: [],
    tools: [],
  },
} as const satisfies AgentTypeDefinition;

/** Registers the agent type with Agent Builder; called once, at setup. */
export function registerDiscoveryAgentType(agentBuilder: AgentBuilderPluginSetup): void {
  agentBuilder.agents.registerType(detectionEngineDiscoveryAgentType);
}

/** Makes sure the discovery profile exists in a space before the engine runs it. */
export interface IDiscoveryAgentInstaller {
  ensure(spaceId: string): Promise<void>;
}

/**
 * Installs the profile once per space and process. `ensure` keeps a profile someone edited, so
 * an admin can change its connector or instructions in Agent Builder.
 */
export function createDiscoveryAgentInstaller({
  agentBuilder,
  logger,
}: {
  agentBuilder: AgentBuilderPluginStart;
  logger: Logger;
}): IDiscoveryAgentInstaller {
  const installed = new Map<string, Promise<void>>();
  return {
    ensure(spaceId) {
      const existing = installed.get(spaceId);
      if (existing) {
        return existing;
      }
      const pending = agentBuilder.agents
        .ensure({
          spaceId,
          agent: {
            id: DETECTION_ENGINE_DISCOVERY_AGENT_ID,
            type: DETECTION_ENGINE_DISCOVERY_AGENT_TYPE_ID,
            name: detectionEngineDiscoveryAgentType.name,
            description: detectionEngineDiscoveryAgentType.description,
            labels: ['observability', 'significant-events', 'detection-engine'],
            avatar_symbol: 'DE',
            access_control: { access_mode: AgentAccessControlMode.Public },
            configuration: { tools: [], skill_ids: [], connector_ids: [] },
          },
        })
        .then(() => undefined)
        .catch((error) => {
          installed.delete(spaceId);
          logger.warn(
            `Could not install the detection engine discovery agent in space ${spaceId}: ${getErrorMessage(
              error
            )}`
          );
          throw error;
        });
      installed.set(spaceId, pending);
      return pending;
    },
  };
}
