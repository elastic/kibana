/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { searchAgentInstructionsAgentBuilder } from '@kbn/search-agent';
import { SEARCH_AGENT_ID } from '../../common/constants';
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
  const definition: BuiltInAgentDefinition = {
    id: SEARCH_AGENT_ID,
    name: 'Elasticsearch Onboarding Agent',
    description:
      'Guides developers from intent to a working search experience with Elasticsearch — recommending approaches, designing mappings, and generating production-ready code.',
    avatar_icon: 'logoElasticsearch',
    labels: ['search'],
    configuration: {
      replace_default_instructions: true,
      instructions: searchAgentInstructionsAgentBuilder,
      tools: [{ tool_ids: SEARCH_AGENT_TOOL_IDS }],
    },
  };

  plugins.agentBuilder?.agents.register(definition);
  logger.debug('Successfully registered search agent in agent-builder');
};
