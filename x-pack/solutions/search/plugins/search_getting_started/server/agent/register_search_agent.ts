/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { skills, agents } from '@kbn/search-agent';
import type { SearchGettingStartedSetupDependencies } from '../types';

const SEARCH_AGENT_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
  platformCoreTools.productDocumentation,
];

export const registerSearchAgent = ({
  plugins,
  logger,
}: {
  plugins: SearchGettingStartedSetupDependencies;
  logger: Logger;
}) => {
  if (!plugins.agentBuilder) {
    logger.debug(
      'Agent Builder plugin is not available, skipping search onboarding agent registration'
    );
    return;
  }
  const { agentBuilder } = plugins;
  const skillIds = [];
  for (const skill of skills) {
    const id = `search.${skill.id}`;
    agentBuilder.skills.register({
      ...skill,
      id,
      basePath: 'skills/search',
    });
    skillIds.push(id);
    logger.debug(`Successfully registered ${id} skill in agent-builder`);
  }
  for (const agent of agents) {
    agentBuilder.agents.register({
      ...agent,
      configuration: {
        ...agent.configuration,
        replace_default_instructions: true,
        skill_ids: skillIds,
        tools: [{ tool_ids: SEARCH_AGENT_TOOL_IDS }],
      },
    });
    logger.debug(`Successfully registered ${agent.id} agent in agent-builder`);
  }
};
