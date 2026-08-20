/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import type { AgentLookup } from './types';

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
    const [agentList, skillList] = await Promise.all([agentRegistry.list(), skillRegistry.list()]);
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
