/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { skills } from '@kbn/search-agent';

export const registerSearchSkills = ({
  agentBuilder,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  logger: Logger;
}) => {
  for (const skill of skills) {
    const id = `search.${skill.id}`;
    agentBuilder.skills.register({
      ...skill,
      id,
      basePath: 'skills/search',
    });
    logger.debug(`Successfully registered ${id} skill in agent-builder`);
  }
};
