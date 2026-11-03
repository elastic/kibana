/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { registerTools } from './tools/register_tools';
import { registerAttachments } from './attachments/register_attachments';
import { registerSkills } from './skills/register_skills';
import type { ObservabilityAgentBuilderDataRegistry } from './data_registry/data_registry';
import type {
  ObservabilityAgentBuilderStartServices,
  ObservabilityAgentBuilderToolPlugins,
} from './types';

/**
 * What Observability Agent Builder contributes to Agent Builder: its tools, the investigation skill
 * and the attachment types. Shared by the plugin's `server` entry and its tasks entry.
 */
export const registerObservabilityAgentBuilder = ({
  core,
  plugins,
  dataRegistry,
  logger,
}: {
  core: ObservabilityAgentBuilderStartServices;
  plugins: ObservabilityAgentBuilderToolPlugins;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
}) => {
  registerSkills({ plugins, logger });

  registerTools({ core, plugins, dataRegistry, logger }).catch((error) => {
    logger.error(`Error registering observability tools: ${error}`);
  });

  registerAttachments({ core, plugins, logger, dataRegistry }).catch((error) => {
    logger.error(`Error registering observability attachments: ${error}`);
  });
};
