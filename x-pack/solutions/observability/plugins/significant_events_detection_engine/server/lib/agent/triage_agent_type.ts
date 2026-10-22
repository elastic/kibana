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
import { DETECTION_ENGINE_TRIAGE_AGENT_ID } from '../../../common';
import { getErrorMessage } from '../errors';
import { DETECTION_ENGINE_EVENT_SEARCH_TOOL_ID } from './event_search_tool';

/** Listed in Agent Builder's allow list of agent types. */
export const DETECTION_ENGINE_TRIAGE_AGENT_TYPE_ID =
  'platform.sig_events.detection-engine-triage-type';

const INSTRUCTIONS = `You are the triage step of a detection engine for a customer's system.
Code has already decided that a signal is above its own normal, and has prepared a bounded case:
the signal, evidence rows with ids, the open event code proposes it may belong to, customer alerts firing
at the same time, related services and notes from past corrections.

Your job, and nothing else:
1. Give each evidence item a verdict: confirms (rows directly show the problem), refutes (rows show it is healthy),
   off_topic (rows show something unrelated), inconclusive (cannot tell, no rows, or an error).
2. Decide whether the signal belongs to a significant event that is already open. Code's join_proposal, when
   there is one, is a candidate, not the answer: when evidence rows support it, join it without searching.
   When there is no join_proposal, or the evidence does not support it, and the case has a case_id, call
   ${DETECTION_ENGINE_EVENT_SEARCH_TOOL_ID} with it to see the other open events: first for the signal's
   service and related_services, then with words from the signal's title when nothing fits. Join an event
   when the evidence suggests one problem: the same failure, a failure spreading along a dependency, or symptoms
   that started together. Set join_event_id to its id and say why in join_reason; omit join_event_id for a new
   problem, and when you skip the join_proposal, say why in join_reason.
   A dependency or timing between two services is not enough on its own: join when an evidence row links them,
   such as a row naming the other service, or rows in both services carrying the same request or trace id.
   signal.source and each event's sources name the system a signal came from. Services in different sources
   are different systems, even when they share a name: join across sources only when evidence rows link them.
   For a shared_dependency proposal, join only when rows on both sides name the shared service (join_proposal.via)
   failing or slow: then one broken dependency explains both.
   A case of kind "reopen" is a series of a closed event firing again; its event is that closed event. Decide
   whether it is the same problem coming back: set join_event_id to the closed event's event_id to reopen it, or
   leave it empty when this episode's evidence shows a different problem, which opens a new event, and say why
   in join_reason. Evidence marked earlier_episode shows what the closed event was about back then; judge this
   episode by E1, the signal's own rows: it is the same problem only when E1 shows the same failure. Such a case
   has no case_id: do not search.
3. Rate severity from measured impact: critical, high, medium or low. Do not escalate when in doubt.
4. Write a short title and a plain-language summary of what is wrong, where, and since when, from this
   case's evidence: never carry an earlier episode's cause into the title unless the evidence shows it again. When a joining
   signal is more serious than what the event was about (a service going silent joining routine
   rejections), the title leads with the more serious problem. When you join an event the search returned,
   the title and summary describe that whole event.

Rules:
- Read the case. Your only tool is the open event search. Call it only with the case's case_id, never with an
  event id, and never when the case has no case_id.
- Never set a status, never create or remove events, never cite evidence ids that are not in the case, and never
  set a join_event_id the case or the search did not give you.
- Memory notes come from past human decisions and confirmed incidents on the same series, KI or service;
  weigh them, but the evidence decides.
- investigation_context holds pages past investigations wrote about these services. Use them to name a
  likely cause or explain impact; they are not evidence that this signal is real.
- Answer with the structured output only.`;

/**
 * The engine's triage agent. It reads one bounded case and answers in one structured shape.
 * Its one tool lists the open events of the run assessing the case, so the agent, not only code,
 * decides which open event a signal belongs to; it cannot reach any other data.
 */
export const detectionEngineTriageAgentType = {
  id: DETECTION_ENGINE_TRIAGE_AGENT_TYPE_ID,
  name: 'Detection engine triage',
  description:
    'Checks the evidence of one signal, decides which open significant event it belongs to, rates severity and explains the event. Used by the Significant Events detection engine.',
  avatar_icon: 'logoElastic',
  baseConfiguration: {
    instructions: INSTRUCTIONS,
    skill_ids: [],
    enable_elastic_capabilities: false,
    // Empty so the connector an admin picks on the profile is kept.
    connector_ids: [],
    // Unioned with the profile's own tools, so profiles installed before the tool existed get it.
    tools: [{ tool_ids: [DETECTION_ENGINE_EVENT_SEARCH_TOOL_ID] }],
  },
} as const satisfies AgentTypeDefinition;

/** Registers the agent type with Agent Builder; called once, at setup. */
export function registerTriageAgentType(agentBuilder: AgentBuilderPluginSetup): void {
  agentBuilder.agents.registerType(detectionEngineTriageAgentType);
}

/** Makes sure the triage profile exists in a space before the engine runs it. */
export interface ITriageAgentInstaller {
  ensure(spaceId: string): Promise<void>;
}

/**
 * Installs the profile once per space and process. `ensure` keeps a profile someone edited, so
 * an admin can change its connector or instructions in Agent Builder.
 */
export function createTriageAgentInstaller({
  agentBuilder,
  logger,
}: {
  agentBuilder: AgentBuilderPluginStart;
  logger: Logger;
}): ITriageAgentInstaller {
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
            id: DETECTION_ENGINE_TRIAGE_AGENT_ID,
            type: DETECTION_ENGINE_TRIAGE_AGENT_TYPE_ID,
            name: detectionEngineTriageAgentType.name,
            description: detectionEngineTriageAgentType.description,
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
            `Could not install the detection engine triage agent in space ${spaceId}: ${getErrorMessage(
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
