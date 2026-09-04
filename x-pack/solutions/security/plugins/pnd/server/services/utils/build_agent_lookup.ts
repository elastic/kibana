/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  AgentTypeDefinition,
  InternalAgentDefinition,
} from '@kbn/agent-builder-server/agents';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';

export interface AgentTypeSnapshot {
  baseConfiguration: {
    skill_ids?: readonly string[];
  };
}

export interface AgentLookup {
  getAgent: (id: string) => InternalAgentDefinition | null | undefined;
  getAgentType: (typeId: string) => AgentTypeSnapshot | null | undefined;
  getSkill: (id: string) => InternalSkillDefinition | null | undefined;
}

// Fetches agent and skill registries from the agent-builder plugin and returns a lookup
// object for resolving agent definitions, agent types, and skills by ID. Returns undefined
// if the registries are unavailable (e.g. agent-builder is disabled or the request fails).
export const buildAgentLookup = async (
  agentBuilder: AgentBuilderPluginStart,
  agentTypeMap: ReadonlyMap<string, AgentTypeDefinition>,
  request: KibanaRequest,
  logger: Logger
): Promise<AgentLookup | undefined> => {
  try {
    const [agentRegistry, skillRegistry] = await Promise.all([
      agentBuilder.agents.getRegistry({ request }),
      agentBuilder.skills.getRegistry({ request }),
    ]);
    const [agentList, skillList] = await Promise.all([
      agentRegistry.list({ includeManaged: true }),
      skillRegistry.list({ includePlugins: true, summaryOnly: true }),
    ]);
    const agentMap = new Map(agentList.map((a) => [a.id, a]));
    const skillMap = new Map(skillList.map((s) => [s.id, s]));
    return {
      getAgent: (id) => agentMap.get(id) ?? null,
      getSkill: (id) => skillMap.get(id) ?? null,
      getAgentType: (typeId) => {
        const typeDef = agentTypeMap.get(typeId);
        if (!typeDef) return null;
        const base =
          typeof typeDef.baseConfiguration === 'function' ? undefined : typeDef.baseConfiguration;
        return { baseConfiguration: { skill_ids: base?.skill_ids } };
      },
    };
  } catch (error) {
    logger.debug(
      `Failed to build agent lookup: ${error instanceof Error ? error.message : String(error)}`
    );
    return undefined;
  }
};
