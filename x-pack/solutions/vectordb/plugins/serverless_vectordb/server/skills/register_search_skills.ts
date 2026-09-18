/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { skills } from '@kbn/search-agent';

const VECTORDB_PROJECT_TYPE = 'vectordb';

/**
 * Registers the search skills that `search_getting_started` provides, since that plugin belongs to
 * the `search` group and is therefore not loaded in a VectorDB project.
 *
 * Both plugins are loaded in the same process whenever plugin groups are not restricted (for
 * example `plugins.forceEnableAllPlugins`, used by the saved objects and OAS CLI checks), and the
 * skill service rejects duplicate ids, so registration is limited to real VectorDB projects.
 */
export const registerSearchSkills = ({
  agentBuilder,
  cloud,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  cloud?: CloudSetup;
  logger: Logger;
}) => {
  if (cloud?.serverless.projectType !== VECTORDB_PROJECT_TYPE) {
    logger.debug(
      'Not running in a VectorDB project, skipping search skills registration in agent-builder'
    );
    return;
  }

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
